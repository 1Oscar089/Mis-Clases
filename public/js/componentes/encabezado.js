// ============================================================
// encabezado.js — ENCABEZADO de la clase (js/componentes/encabezado.js)
// (js/componentes/encabezado.js) · v2
//
// Franja inicial de cada clase: a la izquierda los chips
//   [Día N] [Unidad N] [Lección N]
// y a la derecha el PUNTAJE de la sesión, que arranca en cero (o en
// el total ya guardado del estudiante) y sube cuando las actividades
// de la clase suman puntos.
//
// ─── PARÁMETROS (crearEncabezado({ … }) · todos opcionales) ───
//   clase          El documento de la clase tal como lo entrega el
//                  proyecto al abrir la clase:
//                  { id, dia, unidad, leccion, clase, grado, materiaId }
//                  → pinta los chips al instante. Si solo tenés el
//                    id, pasa `claseId` + `grado` + `materiaId` y el
//                    encabezado lo busca solo en Firestore (db.js).
//   claseId        id de la clase (con grado + materiaId, si no se
//                  pasó `clase` completo).
//   grado          grado numérico de la clase (para la búsqueda).
//   materiaId      id de la materia (para la búsqueda).
//   perfil         perfil del usuario: se usa para leer la nota ya
//                  guardada (notas/{uid}/clases/{claseId}) y mostrarla
//                  como puntaje inicial (0 si no hay nada guardado).
//   puntajeInicial Número para ARRANCAR con un puntaje fijo (pisa la
//                  lectura de la nota guardada).
//   ancho          Ancho del encabezado (número px, fracción 0..1 o
//                  CSS "60%"). Sin ancho → bloque entero.
//   contenedor     Si se pasa, el encabezado se agrega ahí.
//
// ─── CÓMO SE SUMAN PUNTOS (desde la clase o desde actividades) ───
//   · Evento global:  document.dispatchEvent(new CustomEvent("mco:puntaje",
//                     { detail: { delta: 2.5 } }))   → suma
//                     { detail: { total: 10 } })      → fija el total
//   · Atajos exportados:  sumarPuntaje(2.5)  ·  fijarPuntaje(10)
//   Ejemplo con una actividad (la promesa devuelve los puntos ganados):
//     const pts = await sopaLetras({ contenedor: zona, perfil, clase, … });
//     sumarPuntaje(pts);
//
// ─── DEVUELVE ───
//   El elemento .comp-encabezado con métodos propios:
//     .sumar(n)  ·  .fijar(n)  ·  .obtener()
//   (El puntaje se redondea a 1 decimal, igual que las notas.)
//
// Nota: poné UN solo encabezado por página.
// ============================================================

// v2 — CERO import estático de ../data/db.js: se trae SOLO cuando
// hacen falta datos (clase por id / nota guardada) y si falla, el
// encabezado queda igual (chips + puntaje en 0). Así el bloque nunca
// rompe por una copia vieja o ausente de otra carpeta.
import { inyectarEstilos, aplicarAncho } from "./base.js";

// db.js bajo demanda (mejor esfuerzo): devuelve el módulo o null.
function dbQuizas() {
  return import("../data/db.js")
    .then((m) => (m && m.db) || null)
    .catch(() => null);
}

function redondear1(n) {
  return Math.round(Number(n) * 10) / 10;
}

/** Suma puntos al puntaje del encabezado (evento global). */
export function sumarPuntaje(delta) {
  document.dispatchEvent(
    new CustomEvent("mco:puntaje", { detail: { delta: Number(delta) || 0 } })
  );
}

/** Fija el puntaje total del encabezado (evento global). */
export function fijarPuntaje(total) {
  document.dispatchEvent(
    new CustomEvent("mco:puntaje", { detail: { total: Number(total) || 0 } })
  );
}

/* ---------------- CSS implícito ---------------- */

function estilos() {
  inyectarEstilos(
    "comp-encabezado-estilos",
    `
    .comp-encabezado {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .6rem;
      flex-wrap: wrap;
      margin: 0 0 .9rem;
      font-family: system-ui, sans-serif;
    }
    .comp-enc-chips {
      display: flex;
      align-items: center;
      gap: .4rem;
      flex-wrap: wrap;
      min-width: 0;
    }
    .comp-enc-chip {
      background: rgba(37, 99, 235, .12);
      color: #2563eb;
      font-size: .74rem;
      font-weight: 800;
      padding: .18rem .6rem;
      border-radius: 999px;
      white-space: nowrap;
    }
    .comp-enc-puntaje {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      background: #ffffff;
      border: 1.5px solid #7c3aed;
      color: #6d28d9;
      border-radius: 999px;
      padding: .22rem .8rem;
      box-shadow: 0 3px 12px rgba(124, 58, 237, .12);
      white-space: nowrap;
    }
    .comp-enc-puntaje-etiqueta {
      font-size: .72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: #8b5cf6;
    }
    .comp-enc-puntaje-valor {
      font-size: 1.05rem;
      font-weight: 800;
      color: #6d28d9;
      min-width: 1.6ch;
      text-align: center;
      transition: transform .18s ease;
    }
    .comp-enc-puntaje-valor.comp-enc-latido {
      transform: scale(1.28);
    }
    @media (max-width: 767px) {
      .comp-encabezado { justify-content: center; }
    }
  `
  );
}

/* ---------------- Componente ---------------- */

export function crearEncabezado(opciones = {}) {
  estilos();
  const opc = opciones || {};

  const caja = document.createElement("div");
  caja.className = "comp-encabezado";
  aplicarAncho(caja, opc.ancho);

  /* --- chips a la izquierda --- */
  const chips = document.createElement("div");
  chips.className = "comp-enc-chips";
  caja.append(chips);

  function pintarChips(clase) {
    chips.innerHTML = "";
    if (!clase) return;
    const pares = [
      ["dia", "Día"],
      ["unidad", "Unidad"],
      ["leccion", "Lección"],
    ];
    pares.forEach(([campo, rótulo]) => {
      const valor = clase[campo];
      if (valor == null || valor === "") return;
      const chip = document.createElement("span");
      chip.className = "comp-enc-chip";
      chip.textContent = rótulo + " " + valor;
      chips.append(chip);
    });
  }
  pintarChips(opc.clase || null);

  /* --- puntaje a la derecha --- */
  const puntaje = document.createElement("div");
  puntaje.className = "comp-enc-puntaje";
  puntaje.setAttribute("aria-label", "Puntaje de la clase");

  const etiqueta = document.createElement("span");
  etiqueta.className = "comp-enc-puntaje-etiqueta";
  etiqueta.textContent = "Puntaje";

  const valor = document.createElement("span");
  valor.className = "comp-enc-puntaje-valor";
  valor.textContent = "0";
  valor.setAttribute("aria-live", "polite");

  puntaje.append(etiqueta, valor);
  caja.append(puntaje);

  let actual = redondear1(Number(opc.puntajeInicial ?? 0) || 0);
  valor.textContent = String(actual);

  function latido() {
    valor.classList.add("comp-enc-latido");
    setTimeout(() => valor.classList.remove("comp-enc-latido"), 200);
  }

  const metodos = {
    /** Suma puntos (admite negativos). */
    sumar(delta) {
      actual = redondear1(actual + (Number(delta) || 0));
      valor.textContent = String(actual);
      latido();
    },
    /** Fija el total. */
    fijar(total) {
      actual = redondear1(Number(total) || 0);
      valor.textContent = String(actual);
      latido();
    },
    /** Puntaje actual. */
    obtener() {
      return actual;
    },
  };

  /* --- eventos globales ('mco:puntaje') --- */
  document.addEventListener("mco:puntaje", (e) => {
    const d = (e && e.detail) || {};
    if (d.total != null) metodos.fijar(d.total);
    else if (d.delta != null) metodos.sumar(d.delta);
  });

  /* --- datos que faltan: clase por id y nota guardada --- */
  (async () => {
    try {
      const db = await dbQuizas();
      if (!db) return;   // sin capa de datos: queda chips + 0, sin error
      // Chips: si no vino la clase completa, buscarla por id
      if (!opc.clase && opc.claseId != null && opc.grado != null && opc.materiaId) {
        const lista = await db.clases.listar(opc.grado, opc.materiaId);
        const hallada = (lista || []).find((c) => c.id === String(opc.claseId));
        if (hallada) pintarChips(hallada);
      }
      // Puntaje inicial: la nota ya guardada del estudiante (si no
      // nos dieron un puntajeInicial fijo)
      if (opc.puntajeInicial == null) {
        const claseId = (opc.clase && opc.clase.id) || opc.claseId;
        const uid = opc.perfil && opc.perfil.uid;
        if (uid && claseId != null) {
          const nota = await db.notas.leer(uid, claseId);
          if (nota && Number.isFinite(Number(nota.puntos))) metodos.fijar(nota.puntos);
        }
      }
    } catch (e) {
      /* sin datos extra: los chips ya pintados y el puntaje en 0 */
    }
  })();

  // Método global de refresco para el docente que escribe contenido
  caja.sumar = metodos.sumar;
  caja.fijar = metodos.fijar;
  caja.obtener = metodos.obtener;

  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(caja);
  }
  return caja;
}
