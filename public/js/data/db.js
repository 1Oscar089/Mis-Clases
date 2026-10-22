// ============================================================
// db.js — ÚNICA capa de acceso a datos (js/data/db.js) · v2
//
// REGLA DEL PROYECTO: NINGÚN otro archivo toca Firestore o Sheets.
//   · Firebase AUTH (login Google) queda en components/auth.js:
//     es autenticación, no base de datos.
//   · TODO lo demás (users, clases, notas, hojas…) pasa por aquí.
//
// NUEVO EN v2 (lo pedido para clases · tareas · exámenes · recursos):
//   · db.clases.actualizar(grado, materiaId, id, campos)
//       → el DOCENTE pone visible:true|false en la pieza (boolean
//         guardado en Firestore). Las piezas invisibles NO existen
//         para el estudiante.
//       → sirve también para cualquier otro campo suelto.
//   · db.usuarios.porGrado(grado)
//       → lista de estudiantes del grado (users/{uid} cuyo grados
//         contiene ese grado). Es la lista que usa el modal de
//         RESULTADOS del docente (nota por actividad + nota final).
//   · db.notas.guardar(uid, claseId, nota, contexto?)
//       → además de notas/{uid}/clases/{claseId} (fuente de verdad,
//         donde los bloques se bloquean al responder), ESPEJA la
//         NOTA DEL DÍA/CLASE en el PERFIL del estudiante:
//         users/{uid}.notas.{claseId} =
//           { puntos, respondidas, tipo, dia, unidad, leccion,
//             materia, grado, titulo, enviado, actualizadoEn }
//         (el espejo es de mejor esfuerzo: si falla, la nota vive
//         igual en notas/ y en Google Sheets).
//
// ESTRUCTURA DE LAS PIEZAS (clases, tareas, exámenes y recursos):
//   TODAS viven en Firestore como clases:
//     clases/{grado}/{materiaId}/{id}
//       { tipo:"clase"|"tarea"|"examen"|"recurso",
//         visible:true|false, dia, unidad, leccion,
//         clase (título), creadoEn, creadoPor }
//   — "guardar exámenes y tareas será como clases": misma ruta, con
//     el campo tipo aparte. La vista (clases.js / examenes.js /
//     tareas.js / recursos.js) filtra por tipo.
//
// ESTADO ACTUAL:
//   · db.usuarios (users/{uid})                     ✅ + porGrado
//   · db.clases   (clases/{grado}/{materia}/{id})   ✅ + actualizar
//   · db.notas    (notas/{uid}/clases/{claseId})    ✅ + espejo en user
//   · db.sheets   (puente con Google Sheets)        ✅
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
  query,
  where,
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

  /** NUEVO v2 — Estudiantes de UN grado: users/{uid} cuyo campo
   *  grados (array) contiene ese grado. Es la lista del MODAL DE
   *  RESULTADOS del docente (nota por actividad + nota final).
   *  Devuelve [{ uid, nombre, nie, rol, grados, … }]. Puede lanzar. */
  async porGrado(grado) {
    const snap = await getDocs(
      query(
        collection(firestore, "users"),
        where("grados", "array-contains", Number(grado))
      )
    );
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  },
};

/* ---------- CLASES — Firestore: clases/{grado}/{materia}/{id} ----------
   Aquí viven clase, tarea, examen Y RECURSO (todas "como clases",
   con el campo tipo aparte y el boolean visible del docente). */

const clases = {
  /** Lista de piezas de UNA materia de un grado → [{ id, ...datos }].
   *  Devuelve TODAS (visibles e invisibles): el filtro de visible y
   *  de tipo lo hace la vista (el docente debe verlas todas). */
  async listar(grado, materiaId) {
    const snap = await getDocs(
      collection(firestore, "clases", String(grado), materiaId)
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** ¿Existe ya una pieza con ese id? (para no duplicar al crear). */
  async existe(grado, materiaId, id) {
    const snap = await getDoc(
      doc(firestore, "clases", String(grado), materiaId, id)
    );
    return snap.exists();
  },

  /** Crea la pieza; db añade creadoEn (serverTimestamp). */
  async crear(grado, materiaId, id, datos) {
    await setDoc(doc(firestore, "clases", String(grado), materiaId, id), {
      ...datos,
      creadoEn: serverTimestamp(),
    });
  },

  /** NUEVO v2 — Actualiza campos sueltos de UNA pieza. El uso
   *  principal: el OJO del docente → { visible: true|false }
   *  (piezas invisibles: el estudiante ni sabe que existen). */
  async actualizar(grado, materiaId, id, campos) {
    await updateDoc(
      doc(firestore, "clases", String(grado), materiaId, id),
      campos || {}
    );
  },
};

/* ------------- NOTAS — Firestore: notas/{uid}/clases/{claseId} -------------
   La nota de UNA sesión de trabajo (clase, tarea o examen) es
   { puntos, preguntas: { [qid]: valor }, tipo?, enviado? } y vive en
   Firestore para que el BLOQUEO de actividades ya hechas sobreviva a
   cerrar/abrir sesión y cambie de dispositivo sin perderse.
   localStorage es el respaldo inmediato y Sheets (reportarActividad)
   el ESPEJO para las tablas del docente.

   NUEVO v2 — cada guardado ESPEJA la nota del día/clase en el PERFIL
   del estudiante (users/{uid}.notas.{claseId}) con el contexto de la
   pieza (día, unidad, lección, materia, grado, título): así queda,
   en el propio usuario, la nota de CADA clase/tarea/examen. */

// "d1-u2-l3-mi-clase" → 1 (el día va al inicio del id de una pieza)
function diaDeId(claseId) {
  const m = /^d(\d+)-/.exec(String(claseId || ""));
  return m ? Number(m[1]) : null;
}

// Firestore no admite puntos en claves de mapa: los ids de pieza no
// llevan puntos, pero se defiende por si acaso.
function claveSegura(clave) {
  return String(clave || "").replace(/\./g, "-");
}

function resumenParaPerfil(nota, contexto, claseId) {
  const ctx = contexto && typeof contexto === "object" ? contexto : {};
  const resumen = {
    puntos: Math.round((Number(nota && nota.puntos) || 0) * 10) / 10,
    respondidas: Object.keys((nota && nota.preguntas) || {}).length,
    tipo: String(nota?.tipo || ctx.tipo || "clase"),
  };
  if (nota && nota.enviado != null) resumen.enviado = !!nota.enviado;

  // Contexto de la pieza: lo que pasó el llamador… o lo deducible del id
  const clase = ctx.clase && typeof ctx.clase === "object" ? ctx.clase : null;
  const dia = Number(clase && clase.dia) || diaDeId(claseId);
  if (dia != null) resumen.dia = dia;
  if (clase) {
    if (clase.unidad != null && clase.unidad !== "") resumen.unidad = clase.unidad;
    if (clase.leccion != null && clase.leccion !== "") resumen.leccion = clase.leccion;
    if (clase.materia) resumen.materia = clase.materia;
    if (clase.materiaId) resumen.materiaId = clase.materiaId;
    if (clase.grado != null) resumen.grado = clase.grado;
  }
  if (ctx.materia) resumen.materia = ctx.materia;
  if (ctx.grado != null) resumen.grado = ctx.grado;
  const titulo = String(
    (clase && (clase.clase || clase.titulo)) || ctx.titulo || ""
  ).trim();
  if (titulo) resumen.titulo = titulo;
  return resumen;
}

const notas = {
  /** Nota { puntos, preguntas } del usuario en esa clase/tarea/examen
      o null si no existe. Puede lanzar (Firestore = fuente de verdad). */
  async leer(uid, claseId) {
    const snap = await getDoc(
      doc(firestore, "notas", String(uid), "clases", String(claseId))
    );
    return snap.exists() ? snap.data() : null;
  },

  /** Guarda la nota completa (merge; añade actualizadoEn). Puede lanzar
      (el propio guardado en notas/…). El ESPEJO en users/{uid}.notas
      es de mejor esfuerzo: si falla, la nota ya está a salvo.
      contexto (opcional): { tipo?, titulo?, materia?, grado?, clase? }
      — lo pasan las utils (opcionMultiple.js) con la pieza abierta. */
  async guardar(uid, claseId, nota, contexto) {
    await setDoc(
      doc(firestore, "notas", String(uid), "clases", String(claseId)),
      { ...nota, actualizadoEn: serverTimestamp() },
      { merge: true }
    );

    // ── Espejo: NOTA DEL DÍA/CLASE en el user del estudiante ──
    try {
      const resumen = resumenParaPerfil(nota, contexto, claseId);
      await setDoc(
        doc(firestore, "users", String(uid)),
        { ["notas." + claveSegura(claseId)]: { ...resumen, actualizadoEn: serverTimestamp() } },
        { merge: true }
      );
    } catch (e) {
      console.warn("[db] espejo de nota en users/ no guardó:", e?.code || e?.message || e);
    }
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

  /** NUEVO v2 — Notas de VARIOS estudiantes en UNA pieza (el modal de
      resultados del docente). uds: [{uid,…}] (db.usuarios.porGrado).
      Devuelve [{ uid, nombre, nie, nota|null }] — los que fallan
      quedan con nota null (mejor esfuerzo: un estudiante sin permiso
      no tumba el modal). */
  async deEstudiantes(estudiantes, claseId) {
    const lista = Array.isArray(estudiantes) ? estudiantes : [];
    const salidas = await Promise.all(
      lista.map(async (e) => {
        const base = {
          uid: e.uid,
          nombre: e.nombre || "",
          nie: e.nie != null ? e.nie : "",
          nota: null,
        };
        try {
          base.nota = await this.leer(e.uid, claseId);
        } catch (err) {
          base.nota = null;
        }
        return base;
      })
    );
    return salidas;
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
