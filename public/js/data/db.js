// ============================================================
// db.js — ÚNICA capa de acceso a datos (js/data/db.js) · v5
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
// NUEVO EN v3:
//   · db.clases.eliminar(grado, materiaId, id)
//       → borra UNA pieza. La usa el EDITOR de recursos al MOVER un
//         recurso a otro grado/materia (crea la copia en el nuevo
//         lugar y elimina el doc viejo).
//
// NUEVO EN v5 (materias visibles por grado):
//   · db.materias.deGrado(grado)
//       → MAPA de visibilidad de materias de UN grado:
//         { comunicacion: false, artes: true, … } (lo que no aparece
//         o no es false ⇒ VISIBLE). Es lo que usan las vistas del
//         ESTUDIANTE (clases, tareas, exámenes, recursos y las
//         nuevas a futuro) para OCULTAR materias enteras.
//   · db.materias.setVisible(grado, materiaId, visible)
//       → el DOCENTE elige qué materias se ven para ese grado.
//         Guarda un boolean por materia en el documento
//         clases/{grado}/config/materias (db.js v5): lo que no es
//         false ⇒ VISIBLE. La misma la usa recursos.js (botón
//         «Materias visibles» con un grado elegido).
//   · db.materias.vigilar(grado, alCambiar)
//       → onSnapshot del documento: si el docente oculta una materia
//         EN VIVO, las vistas reciben el mapa nuevo al instante (el
//         estudiante dentro de esa materia vuelve solo al inicio).
//         deGrado/vigilar son de MEJOR ESFUERZO (fallo ⇒ materias
//         visibles, la app nunca se rompe); setVisible SÍ lanza
//         (la UI avisa con su toast).
//
// NUEVO EN v7.2 (bloqueo automático por envío de examen):
//   · db.clases.bloquearEstudiante(grado, materiaId, id, uid)
//       → marca bloqueadas.{uid} = true en la pieza en cuanto el
//         estudiante ENVÍA su examen (lo llama finalizarExamen de
//         js/utils/opcionMultiple.js). Escritura por puntos: NO pisa
//         el resto del mapa del docente. El estudiante queda fuera
//         de la pieza (igual que el candado) y solo puede revisar
//         su puntaje desde la tarjeta («Mi puntaje»).
//
// NUEVO EN v4 (eliminación + cierre en vivo · nota de clase):
//   · db.clases.vigilar(grado, materiaId, alCerrar)
//       → VIGÍA EN TIEMPO REAL (onSnapshot) de las piezas de una
//         materia. Cuando una pieza VISIBLE se borra ("eliminada")
//         o pasa a invisible ("invisible"), llama alCerrar(id,
//         motivo). Con esto, el estudiante que esté DENTRO de una
//         pieza eliminada/ocultada vuelve solo a inicio.js y, si era
//         clase, su nota se consolida.
//   · db.notas.guardarNotaMateria(uid, materiaId, dia, puntos)
//       → NOTA DE CLASE POR MATERIA en Firebase:
//         users/{uid}/notas/{materiaId} = { dia1: 10, dia2: 8.5, … }
//         (un documento por materia; un campo "diaN" por día).
//   · db.notas.consolidarCierre(perfil, pieza)
//       → CIERRA la nota de UNA clase: lee el total en
//         notas/{uid}/clases/{id}, lo EScribe en
//         users/{uid}/notas/{materiaId}.diaN y lo re-reporta a
//         Sheets (columna D{día}·U·L + Σ/Media). Mejor esfuerzo:
//         nunca lanza. SOLO para tipo "clase" (tarea/examen ya
//         reportan al Enviar).
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
//   · db.clases   (clases/{grado}/{materia}/{id})   ✅ + actualizar + vigilar
//   · db.materias (clases/{grado}/config/materias)  ✅ visible/invisible por grado
//   · db.notas    (notas/{uid}/clases/{claseId})    ✅ + espejo user + notas/{materia}
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
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
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

  /** NUEVO v7.2 — BLOQUEO AUTOMÁTICO POR ENVÍO (examen): deja el uid
   *  del estudiante marcado en el mapa bloqueadas de la pieza en
   *  cuanto su examen queda ENVIADO. Escribe la ruta por puntos
   *  bloqueadas.{uid} = true para NO pisar el resto del mapa (los
   *  bloqueos del docente quedan intactos). Con esa marca la pieza
   *  queda CERRADA para ese estudiante — igual que el candado del
   *  docente: no puede volver a entrar, solo revisar su puntaje
   *  desde la tarjeta (botón «Mi puntaje»).
   *  Puede lanzar: lo trata quien llama (finalizarExamen lo deja en
   *  mejor esfuerzo; el bloqueo se reintenta en la próxima visita). */
  async bloquearEstudiante(grado, materiaId, id, uid) {
    const u = claveSegura(uid);
    if (!u) return;
    await updateDoc(
      doc(firestore, "clases", String(grado), materiaId, id),
      {
        ["bloqueadas." + u]: true,
        actualizadoEn: serverTimestamp(),
      }
    );
  },

  /** NUEVO v3 — Elimina UNA pieza. La usa el botón ELIMINAR de las
   *  tarjetas (clases, tareas, exámenes y recursos) y el editor de
   *  recursos al MOVER un recurso a otro grado/materia.
   *  Puede lanzar (Firestore = fuente de verdad). */
  async eliminar(grado, materiaId, id) {
    await deleteDoc(doc(firestore, "clases", String(grado), materiaId, id));
  },

  /** NUEVO v4 · v7.1 — VIGÍA EN TIEMPO REAL de UNA materia de un
   *  grado. Escucha clases/{grado}/{materiaId} con onSnapshot y llama
   *  alCerrar(id, motivo, datos) cuando una pieza que ESTABA VISIBLE:
   *    · se borra                       → motivo "eliminada"
   *    · pasa a invisible               → motivo "invisible"
   *    · se BLOQUEA para el estudiante  → motivo "bloqueada"
   *    · se DESBLOQUEA para él          → motivo "desbloqueada" (v7.1)
   *  v7.1 — BLOQUEO PERSONALIZADO: con uid (estudiante) el motivo
   *  "bloqueada" sale cuando el docente pone bloqueada: true (TODOS)
   *  O marca SU uid en el mapa bloqueadas; también sale la primera vez
   *  que el mapa pasa a incluirlo. Sin uid (compatibilidad) solo mira
   *  el boolean global. `datos` = los datos frescos del doc (el
   *  listado se actualiza con el estado real). Las piezas invisibles
   *  o nuevas no disparan nada (el estudiante nunca pudo entrar a
   *  ellas). Devuelve la función quitar() del listener. */
  vigilar(grado, materiaId, alCerrar, uid = null) {
    const ref = collection(firestore, "clases", String(grado), materiaId);
    const visibles = new Map(); // id → estaba visible (true|false)
    const bloqueo = new Map();  // id → estado de bloqueo anterior {global, mapa}
    const paraMi = (estado) =>
      uid
        ? estado.global || estado.mapa[uid] === true
        : estado.global;
    const quitar = onSnapshot(
      ref,
      (snap) => {
        const actuales = new Set();
        snap.forEach((d) => {
          actuales.add(d.id);
          const datos = d.data();
          const visible = datos.visible !== false;
          const estado = {
            global: datos.bloqueada === true,
            mapa:
              datos.bloqueadas && typeof datos.bloqueadas === "object"
                ? datos.bloqueadas
                : {},
          };
          const antes = visibles.get(d.id);
          const antesEstado = bloqueo.get(d.id);
          const estaParaMi = paraMi(estado);
          const antesParaMi = antesEstado ? paraMi(antesEstado) : false;
          if (antes === true && !visible) {
            try { alCerrar?.(d.id, "invisible", datos); } catch (e) { /* aviso propio */ }
          }
          // BLOQUEO (v6 global · v7.1 por estudiante): estaba abierta
          // (visible y sin bloqueo para MÍ) y el docente me bloqueó →
          // el estudiante que esté DENTRO vuelve al inicio.
          if (antes === true && !antesParaMi && estaParaMi) {
            try { alCerrar?.(d.id, "bloqueada", datos); } catch (e) { /* aviso propio */ }
          } else if (antes === true && antesParaMi && !estaParaMi) {
            // v7.1 — DESBLOQUEO para mí: solo refresca el listado
            try { alCerrar?.(d.id, "desbloqueada", datos); } catch (e) { /* aviso propio */ }
          }
          visibles.set(d.id, visible);
          bloqueo.set(d.id, estado);
        });
        // Borradas: estaban registradas y ya no existen en la colección
        for (const [id, estabaVisible] of visibles) {
          if (!actuales.has(id)) {
            visibles.delete(id);
            bloqueo.delete(id);
            if (estabaVisible) {
              try { alCerrar?.(id, "eliminada"); } catch (e) { /* aviso propio */ }
            }
          }
        }
      },
      (e) => console.warn("[db] vigía clases:", e?.code || e?.message || e)
    );
    return quitar;
  },
};

/* ------- MATERIAS VISIBLES POR GRADO — clases/{grado}/config/materias -------
   Un SOLO documento por grado con un boolean por materia:
     clases/{grado}/config/materias = { comunicacion: true, artes: false, … }
   Lo que falta (o true) ⇒ VISIBLE; solo false ⇒ INVISIBLE para el
   estudiante de ESE grado. Es independiente del ojo de cada pieza:
   el ojo oculta UNA clase/tarea/examen/recurso; esto oculta LA
   MATERIA ENTERA (sus 4 tipos) para los estudiantes del grado. */

const materias = {
  /** Mapa de visibilidad del grado → { materiaId: boolean }.
   *  MEJOR ESFUERZO: si falla la lectura devuelve {} (todo visible)
   *  para que la vista del estudiante nunca se rompa. */
  async deGrado(grado) {
    try {
      const snap = await getDoc(
        doc(firestore, "clases", String(grado), "config", "materias")
      );
      return snap.exists() ? snap.data() || {} : {};
    } catch (e) {
      console.warn("[db] materias.deGrado:", e?.code || e?.message || e);
      return {};
    }
  },

  /** El docente hace VISIBLE/INVISIBLE una materia para el grado.
   *  Puede lanzar (Firestore = fuente de verdad; la UI avisa). */
  async setVisible(grado, materiaId, visible) {
    await setDoc(
      doc(firestore, "clases", String(grado), "config", "materias"),
      {
        [claveSegura(materiaId)]: !!visible,
        actualizadoEn: serverTimestamp(),
      },
      { merge: true }
    );
  },

  /** VIGÍA del documento de visibilidad del grado. Llama
   *  alCambiar(mapa) con el mapa FRESCO en cada cambio (y una
   *  primera vez al conectar). Devuelve quitar() del listener. */
  vigilar(grado, alCambiar) {
    const ref = doc(firestore, "clases", String(grado), "config", "materias");
    return onSnapshot(
      ref,
      (snap) => {
        try { alCambiar?.(snap.exists() ? snap.data() || {} : {}); } catch (e) { /* aviso propio */ }
      },
      (e) => console.warn("[db] vigía materias:", e?.code || e?.message || e)
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
      · tipo "tarea"/"examen": fila del ESTUDIANTE (NIE) × columna de
        la actividad (T/E D{día}·U·L título) con el TOTAL (el examen
        se reporta UNA sola vez, desde finalizarExamen() de
        js/utils/opcionMultiple.js). */
  /** NUEVO v4 — NOTA DE CLASE POR MATERIA (Firebase):
   *  users/{uid}/notas/{materiaId} = { diaN: puntos, actualizadoEn }
   *  Un documento por materia; un campo "diaN" por día trabajado
   *  (dia 3 → campo "dia3": 10). Puede lanzar. */
  async guardarNotaMateria(uid, materiaId, dia, puntos) {
    const diaLimpio = Number(dia);
    if (!uid || !materiaId || !Number.isInteger(diaLimpio) || diaLimpio <= 0) {
      throw new Error("nota-materia-datos");
    }
    await setDoc(
      doc(firestore, "users", String(uid), "notas", String(materiaId)),
      {
        ["dia" + diaLimpio]: Math.round((Number(puntos) || 0) * 10) / 10,
        actualizadoEn: serverTimestamp(),
      },
      { merge: true }
    );
  },

  /** NUEVO v4 — Lee el documento de notas por materia del estudiante
   *  (users/{uid}/notas/{materiaId}) → { dia1: 10, … } o null. */
  async notaMateria(uid, materiaId) {
    const snap = await getDoc(
      doc(firestore, "users", String(uid), "notas", String(materiaId))
    );
    return snap.exists() ? snap.data() : null;
  },

  /** NUEVO v4 — CONSOLIDAR LA NOTA AL CERRARSE UNA CLASE.
   *  La llama la vista del ESTUDIANTE cuando su docente elimina la
   *  pieza o la deja invisible y él estaba dentro:
   *    1) lee el TOTAL en notas/{uid}/clases/{pieza.id},
   *    2) lo escribe en users/{uid}/notas/{materiaId}.diaN (Firebase),
   *    3) re-reporta a Sheets la columna D{día}·U·L con ese total
   *       (notas por actividad y nota final: Σ/Media se actualizan).
   *  SOLO tipo "clase": la nota de tarea/examen ya se reporta al
   *  Enviar. Mejor esfuerzo: NUNCA lanza. */
  async consolidarCierre(perfil, pieza) {
    const salida = { ok: true, puntos: 0, firebase: false, sheets: null };
    try {
      if (!perfil?.uid || !pieza?.id) return { ok: false, razon: "datos" };
      const tipo = String(pieza.tipo || "clase").toLowerCase();
      if (tipo !== "clase") return { ...salida, omitido: tipo };

      // 1) Total actual de la clase (si no hay nota, cuenta como 0)
      let nota = null;
      try { nota = await this.leer(perfil.uid, pieza.id); } catch (e) { /* sin nota */ }
      const puntos = Math.round((Number(nota?.puntos) || 0) * 10) / 10;
      salida.puntos = puntos;

      // 2) Firebase: users/{uid}/notas/{materiaId} → diaN: puntos
      const dia = Number(pieza.dia);
      if (Number.isInteger(dia) && dia > 0 && pieza.materiaId) {
        try {
          await this.guardarNotaMateria(perfil.uid, pieza.materiaId, dia, puntos);
          salida.firebase = true;
        } catch (e) {
          salida.errorFirebase = e?.code || e?.message || "error";
        }
      }

      // 3) Sheets: columna D{día}·U·L del estudiante con el total
      salida.sheets = await this.reportarActividad({
        perfil: { nie: perfil.nie, nombre: perfil.nombre },
        clase: { id: pieza.id, dia: pieza.dia, unidad: pieza.unidad, leccion: pieza.leccion },
        materia: pieza.materia || pieza.materiaId,
        grado: pieza.grado,
        tipo: "clase",
        puntos,
        titulo: pieza.clase || pieza.titulo || "",
      });
      return salida;
    } catch (e) {
      return { ok: false, razon: "peticion", detalle: String((e && e.message) || e) };
    }
  },

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

export const db = { usuarios, clases, materias, notas, sheets };
export default db;
