// ============================================================
// crear.js — EDITOR VISUAL «Crear» (js/components/crear.js) · v6
//
// La vista del DOCENTE para armar clases, tareas y exámenes sin
// escribir código. Se abre desde la tarjeta «Crear» del inicio y
// ocupa toda la pantalla con 3 divisiones verticales:
//
//   ┌──────────┬──────────────────────────┬─────────────────┐
//   │ IZQUIERDA│        CENTRO            │    DERECHA      │
//   │ Recursos │  ÁREA DE TRABAJO:        │  VISTA PREVIA   │
//   │ (todos   │  · la SECCIÓN es un      │  (render real:  │
//   │ los comp │    ESPACIO EN BLANCO     │  crearSecciones │
//   │ y utils, │    del tamaño que le des │  de verdad: con │
//   │ menos    │  · TODO lo que sueltes   │  1 sección corre│
//   │ helpers) │    DENTRO de su área     │  y con 2 o más  │
//   │ alfabetico│    pertenece a esa      │  avanza con     │
//   │          │    sección (nada de JSON)│  Siguiente      │
//   │          │  · Sin secciones NO se   │                 │
//   │          │    puede agregar nada    │                 │
//   └──────────┴──────────────────────────┴─────────────────┘
//
// CÓMO FUNCIONA (v4):
//   1. Sin secciones NO se puede agregar nada: el panel avisa
//      «Primero agrega una SECCIÓN».
//   2. La sección es un ESPACIO EN BLANCO (ancho × alto que tú
//      le des) en el área de trabajo. Todo bloque colocado dentro
//      de esa área queda DENTRO de la sección automáticamente:
//      si lo arrastras a otra sección, cambia de dueño. Sin JSON.
//   3. Cada bloque tiene su formulario con EXACTAMENTE los
//      parámetros que su JS necesita (● obligatorio / (opcional)).
//   4. AL GUARDAR, el bloque se monta de verdad en la vista previa
//      y queda con el ANCHO y ALTO exactos que tendrá en el
//      documento; la tarjeta verde del centro es un mapa fiel.
//   5. Los botones Editar/Eliminar viven en la CABECERA de cada
//      tarjeta (en el flujo, nunca fuera de la vista).
//   6. Con UNA sección el documento queda CORRIDO; con DOS o más
//      se avanza con «Siguiente» (y «Anterior»). Igual en el
//      editor y en el código descargado.
//
// NOVEDADES v6 — formato de texto y formularios «¿Cuántas?»:
//   · Los campos de texto muestran una BARRA DE FORMATO con botones
//     (N negrita, I cursiva, ƒ fórmula, x², x₂, color, …) y una
//     VISTA PREVIA «Así se ve» debajo: escribes **negrita** o
//     $x^2+1$ y VES el resultado antes de guardar. Las marcas se
//     pueden COMBINAR («anidar»): el **minuto** marca $10{:}30$.
//     Lo que admite cada campo: los componentes (título, párrafo,
//     lista, aviso, cita…) admiten TODAS las marcas; las
//     indicaciones y opciones de las utils admiten $fórmulas$.
//   · Los bloques con LISTAS de datos (respuestas, opciones,
//     parejas, palabras…) preguntan «¿Cuántas?» y generan ESAS
//     FILAS IDÉNTICAS numeradas: una fila = una respuesta (se
//     cuentan solas). Con círculo o casilla se marca LA correcta
//     sin escribir números. Escribir 5 respuestas ya no es
//     adivinar un formato de líneas.
//
// RUTAS (a prueba de errores):
//   · Este editor VIVE en js/components/crear.js. Desde aquí,
//     "../" es la carpeta js/ (ahí están components, componentes
//     y utils). TODOS los recursos se resuelven contra esa raíz
//     (RAIZ_JS, calculada desde import.meta.url): funciona igual
//     con el servidor local en la raíz del proyecto (Live Server,
//     puerto 5500, URL con /public/…) o sirviendo solo public/.
//   · El CÓDIGO GENERADO se coloca 3 carpetas más adentro
//     (clases/{grado}/{materia}/{id}.js) y desde ahí usa
//     "../../../js/…" — también con components, componentes y utils.
//
// BARRA SUPERIOR: ← Volver · ID · tipo (clase/tarea/examen) ·
// título · Vaciar · Descargar código (previsualización en un modal
// y, si todo está bien, descarga).
//
// CÓDIGO GENERADO: la PÁGINA COMPLETA de la clase, tarea o examen:
//   · flecha «Volver» al INICIO (las tres la llevan);
//   · EXAMEN: no se puede salir sin pulsar «Enviar examen». Si el
//     estudiante INSISTE en salir, el examen se ENVIARÁ con lo que
//     llevaba (lo no respondido queda sin puntos = incorrecto), y
//     si cierra/recarga sin enviar, al volver entra ya enviado;
//   · CARGA RESILIENTE: los módulos NO van con imports estáticos
//     (un archivo faltante mataba la página con «Failed to fetch»);
//     van con cargar(): reintento sin caché, verificación de
//     exportaciones y aviso con el motivo exacto si algo falla;
//   · documento corrido (1 sección) o con Siguiente/Anterior (2+);
//   · cada bloque nuevo es UNA línea —
//       crearTitulo({ texto: "…", contenedor: pon(l1, 0, 0, 820, 48) });
//     con las ayudas lamina() / pon() / fondo() ya incluidas.
//
// EXTENDER (futuras actualizaciones): cada recurso vive en SU BLOQUE
// numerado (marca de inicio/fin + REGISTRO.push + validar con sus
// OBLIGATORIOS). Para agregar uno: pega un BLOQUE nuevo al FINAL del
// archivo, después de la PUERTA DE GUARDADO. Con eso el recurso sale
// solo en el panel, su formulario, la vista previa, el código
// descargado y la validación al guardar. Nada más que tocar.
//
// Nada de este editor escribe en la base de datos: el trabajo queda
// en el navegador (localStorage) y el resultado final es el .js.
// (En la vista previa el perfil es de DOCENTE: las utils entran en
// modo docente — intentos libres y NADA se guarda.)
// ============================================================

import { renderInicio } from "./inicio.js";

/* ============================================================
   HELPERS de parseo y serialización
   ============================================================ */

function esc(t) {
  return String(t ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "Hola <b>" → texto seguro para atributos/value
function valorCampo(t) {
  return String(t ?? "");
}

// "  a \n b \n" → ["a", "b"]  (una línea = un elemento)
function lineas(t) {
  return String(t ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

// número seguro: "12" → 12 · "" → undefined · "abc" → undefined
function num(t) {
  const v = String(t ?? "").trim();
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// JSON seguro; devuelve { ok, valor, error }
function jsonSeguro(t) {
  const v = String(t ?? "").trim();
  if (v === "") return { ok: false, valor: null, error: "vacío" };
  try {
    return { ok: true, valor: JSON.parse(v), error: "" };
  } catch (e) {
    return { ok: false, valor: null, error: "JSON inválido: " + e.message };
  }
}

// Acepta JSON (con objetos) o líneas simples → array mixto
function listaMixta(t) {
  const v = String(t ?? "").trim();
  if (v === "") return { ok: false, valor: null, error: "vacío" };
  if (v.startsWith("[")) return jsonSeguro(v);
  const ls = lineas(v);
  if (!ls.length) return { ok: false, valor: null, error: "vacío" };
  return { ok: true, valor: ls, error: "" };
}

// Líneas "PALABRA | pista" → [{ palabra, pista }] · también JSON
function pares(t, claveA, claveB) {
  const v = String(t ?? "").trim();
  if (v === "") return { ok: false, valor: null, error: "vacío" };
  if (v.startsWith("[")) {
    const j = jsonSeguro(v);
    if (!j.ok) return j;
    return { ok: true, valor: j.valor, error: "" };
  }
  const ls = lineas(v);
  if (!ls.length) return { ok: false, valor: null, error: "vacío" };
  const fuera = [];
  for (const l of ls) {
    const i = l.indexOf("|");
    if (i >= 0) fuera.push({ [claveA]: l.slice(0, i).trim(), [claveB]: l.slice(i + 1).trim() });
    else fuera.push({ [claveA]: l });
  }
  return { ok: true, valor: fuera, error: "" };
}

// "true"/"si"/"sí" → true (checkbox del formulario ya da booleano)
function bool(v, defecto = false) {
  if (v === true || v === "true" || v === "si" || v === "sí") return true;
  if (v === false || v === "false" || v === "no") return false;
  return defecto;
}

/* Serializa un valor a CÓDIGO JS legible (para el archivo generado).
   Los tokens {__raw: "..."} se insertan TAL CUAL (para `perfil`,
   `clase`, funciones, etc.). */
function jsSource(v, nivel = 1) {
  const sangria = "  ".repeat(nivel);
  const sangriaFin = "  ".repeat(nivel - 1);
  if (v === null || v === undefined) return "undefined";
  if (v && v.__raw === true) return String(v.codigo);
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "undefined";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    const items = v.map((x) => sangria + jsSource(x, nivel + 1));
    return "[\n" + items.join(",\n") + "\n" + sangriaFin + "]";
  }
  if (typeof v === "object") {
    const claves = Object.keys(v).filter((k) => v[k] !== undefined);
    if (!claves.length) return "{}";
    const items = claves.map(
      (k) => sangria + (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ": " + jsSource(v[k], nivel + 1)
    );
    return "{\n" + items.join(",\n") + "\n" + sangriaFin + "}";
  }
  return "undefined";
}

/* ============================================================
   RUTAS (v4) — una sola raíz, cero ambigüedad
   ------------------------------------------------------------
   Este archivo vive en  js/components/crear.js.  Desde aquí,
   "../" es la carpeta js/ (con components/, componentes/ y
   utils/). RAIZ_JS se calcula desde import.meta.url: SIEMPRE
   apunta a la carpeta js/ real del proyecto, use el servidor
   que use (Live Server en la raíz del proyecto — URL con
   /public/… — o un servidor montado directamente en public/).

   Las entradas del REGISTRO se escriben DESDE esa raíz:
     "componentes/titulo.js"   ·   "utils/blank.js"
     "recursos/js/visuales/reloj.js"
   ============================================================ */

const RAIZ_JS = new URL("../", import.meta.url);

/* Las entradas del REGISTRO se escriben DESDE la carpeta js/, EXCEPTO
   las visuales ("recursos/js/visuales/…"), que viven en la raíz del
   proyecto (al lado de js/, NO dentro). Sin este caso especial el
   editor buscaba /js/recursos/… y el bloque salía «FALTA el archivo»
   aunque el recurso estuviera en su sitio. */
const RAIZ_APP = new URL("../../", import.meta.url);   // raíz del proyecto

function urlDeRecurso(r) {
  const a = String((r && r.archivo) || "");
  if (a.startsWith("recursos/")) return new URL(a, RAIZ_APP).href;
  return new URL(a, RAIZ_JS).href;
}

/* ============================================================
   REGISTRO DE RECURSOS
   ------------------------------------------------------------
   ▼▼▼ PARA AGREGAR UN RECURSO NUEVO (futuras actualizaciones) ▼▼▼
   Pega UN BLOQUE nuevo al FINAL del archivo (después de la PUERTA
   DE GUARDADO) con su marca de inicio/fin y, dentro del IIFE,
   añade la entrada al REGISTRO con:
     id          clave única (normalmente el nombre del archivo)
     nombre      cómo se ve en el panel izquierdo (alfabético)
     cat         "componentes" | "utils" | "visuales"
     archivo     ruta del módulo DESDE la carpeta js/
                 ("componentes/x.js" · "utils/x.js" ·
                  "recursos/js/visuales/x.js")
     imports     nombres exportados que hay que importar
     funcion     el export que se llama para crear el bloque
     descripcion una línea para el panel izquierdo
     params      campos del formulario del bloque — DEBEN ser
                 EXACTAMENTE los que el JS necesita:
                   k    clave del valor
                   et   etiqueta visible
                   tipo "texto"|"area"|"num"|"sino"|"opcion"|
                        "lineas"|"json"|"repetidor"
                   req  true = obligatorio (se marca con ●)
                   ops  opciones (para tipo "opcion")
                   def  valor por defecto
                   ej   placeholder / ejemplo
                   formato true → barra de formato COMPLETA + vista
                        previa «Así se ve»; "f" → solo botón de
                        $fórmula$ (lo que ese campo admite de verdad)
                 tipo "repetidor" (v6): contador «¿Cuántas?» + N filas
                   idénticas numeradas. Escribe SIEMPRE el mismo
                   formato de líneas que el JS ya leía, así que la
                   vista previa y el código generado no cambian:
                   cuantas   { et, def, min, max } del contador
                   columnas  [{ clave, et, req, formato, ej,
                                resto (une la celda a la línea de la
                                1.ª columna con " | "), json (nombre
                                de la propiedad en modo JSON) }]
                   etiqueta  { clave, et } columna extra con SU clave
                   marca     { tipo: "radio"|"checks", clave, et }
                             marca la(s) correcta(s) sin escribir nºs
                   serializa "json” → filas con extras se guardan
                             como arreglo JSON (lista con párrafo)
                   ayuda     línea de explicación bajo el contador
     aOpciones(valores, ctx)  → objeto de opciones para la llamada
                 REAL (ctx.perfil, ctx.clase, ctx.tipo ya vienen listos)
     aCodigo(valores, ctx)    → (opcional) el MISMO objeto pero para
                 el código generado (usa {__raw:true, codigo:"perfil"}).
                 Si falta, se usa aOpciones() tal cual.
     montaLista true → la función NO recibe `contenedor`: devuelve un
                 controlador con .elemento (o una lista de elementos)
                 que hay que agregar al bloque.
     validar(valores) → (opcional, RECOMENDADO) a prueba de errores:
                 devuelve [{ k, msg }] con lo que FALTE; la PUERTA
                 DE GUARDADO bloquea Guardar y marca esos campos en
                 rojo. Ayudantes listos: obligatorioTexto(),
                 obligatorioNum() y obligatorioJson().
   ▲▲▲ NADA MÁS: panel, formulario, preview y descarga salen solos ▲▲▲
   ============================================================ */

const PERFIL_RAW = { __raw: true, codigo: "perfil" };
const CLASE_RAW = { __raw: true, codigo: "clase" };

// Opciones comunes de alineación de texto
const OPS_ALINEACION = ["izquierda", "centro", "derecha", "justificado"];

// Campo común de las utils: en cuántas partes del ancho va el bloque
// (2 = mitad, 3 = tercio, 4 = cuarto; vacío = bloque entero)
function paramColumnas() {
  return { k: "columnas", et: "Columnas (2 = mitad del ancho)", tipo: "num", ej: "2 · 3 · 4" };
}

/* ============================================================
   REGISTRO DE RECURSOS — BLOQUE POR BLOQUE (a prueba de errores)
   ------------------------------------------------------------
   Cada recurso del panel vive en SU PROPIO bloque numerado:
     · marca de INICIO (número, id, nombre, categoría y sus
       OBLIGATORIOS) y marca de FIN;
     · caja autocontenida (() => { … })() con su REGISTRO.push;
     · validar(valores) → [{ k, msg }] con lo que FALTE. La
       PUERTA DE GUARDADO (al final del archivo) revisa TODOS
       los validar: si algo falta, Guardar NO pasa y los
       campos culpables quedan marcados en rojo con aviso.
   Ayudantes compartidos: obligatorioTexto / obligatorioNum /
   obligatorioJson (más abajo; los usan los validar).
   ============================================================ */

const REGISTRO = [];

/* ── Ayudantes COMPARTIDOS de validación (devuelven [{ k, msg }];
      lista vacía = el campo está bien) ── */
function obligatorioTexto(v, k, et, ej) {
  if (String(v[k] ?? "").trim() !== "") return [];
  return [{ k, msg: "«" + et + "» es obligatorio" + (ej ? " — ej: " + ej : "") + "." }];
}
function obligatorioNum(v, k, et, ej) {
  if (num(v[k]) !== undefined) return [];
  return [{ k, msg: "«" + et + "» es obligatorio y debe ser un número" + (ej ? " — ej: " + ej : "") + "." }];
}
function obligatorioJson(v, k, et, ej, necesitaArreglo) {
  const t = String(v[k] ?? "").trim();
  if (t === "") {
    return [{ k, msg: "«" + et + "» es obligatorio" + (ej ? " — ej: " + ej : "") + "." }];
  }
  const j = jsonSeguro(t);
  if (!j.ok) return [{ k, msg: "«" + et + "» no es JSON válido — ej: " + ej }];
  if (necesitaArreglo && !Array.isArray(j.valor)) {
    return [{ k, msg: "«" + et + "» debe ser una lista JSON [ … ] — ej: " + ej }];
  }
  return [];
}

/* ------------------- COMPONENTES ------------------- */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 1 · «aviso» — Aviso destacado   [componentes]
   Obligatorio: Texto
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "aviso",
    nombre: "Aviso destacado",
    cat: "componentes",
    archivo: "componentes/aviso.js",
    imports: ["crearAviso"],
    funcion: "crearAviso",
    descripcion: "Caja de colores para lo importante (info, éxito, advertencia, error).",
    params: [
      { k: "texto", et: "Texto", tipo: "area", req: true, formato: true, ej: "El examen se ve **una sola vez** y dura $45$ minutos." },
      { k: "tipo", et: "Tipo", tipo: "opcion", ops: ["info", "exito", "advertencia", "error"], def: "info" },
      { k: "titulo", et: "Rótulo corto", tipo: "texto", ej: "Atención" },
      { k: "icono", et: "Mostrar icono", tipo: "sino", def: true },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      tipo: v.tipo || "info",
      titulo: v.titulo || undefined,
      icono: bool(v.icono, true),
      tamano: num(v.tamano),
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "texto", "Texto", "Escribe aquí el aviso"),
  });
})();
/* ════════════════════════════════════════════════ fin BLOQUE 1 · «aviso» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 2 · «calendario» — Calendario del mes   [visuales]
   Obligatorio: Mes (texto) y Año (número)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "calendario",
    nombre: "Calendario del mes",
    cat: "visuales",
    archivo: "recursos/js/visuales/calendario.js",
    imports: ["dibujarCalendario"],
    funcion: "dibujarCalendario",
    descripcion: "Calendario real del mes pedido (el idioma sale del nombre del mes).",
    params: [
      { k: "mes", et: "Mes", tipo: "texto", req: true, ej: "Septiembre · «July» para inglés" },
      { k: "anio", et: "Año", tipo: "num", req: true, def: 2026, ej: "2026" },
      { k: "idioma", et: "Idioma (opcional; gana sobre el mes)", tipo: "texto", ej: "es · en · fr · pt · de · it" },
      { k: "iniciaEn", et: "La semana empieza en", tipo: "opcion", ops: ["lunes", "domingo"], def: "lunes" },
      { k: "ancho", et: "Ancho del calendario (px)", tipo: "num", ej: "320" },
      { k: "mostrarFestividades", et: "Marcar festividades", tipo: "sino" },
      { k: "festividades", et: "Festividades del mes", tipo: "repetidor",
        cuantas: { et: "¿Cuántas festividades?", def: 0, min: 0, max: 30 },
        columnas: [
          { clave: "dia", et: "Día del mes", req: true, ej: "15" },
          { clave: "nombre", et: "Nombre que se muestra", ej: "Día de la Independencia", resto: true },
        ],
        ayuda: "Cada fila es un día festivo que se marca en el calendario. Deja 0 si no quieres marcar ninguno.",
      },
    ],
    aOpciones: (v) => ({
      mes: v.mes || "",
      anio: num(v.anio) ?? 2026,
      idioma: v.idioma || undefined,
      iniciaEn: v.iniciaEn || "lunes",
      ancho: num(v.ancho),
      mostrarFestividades: bool(v.mostrarFestividades),
      festividades: pares(v.festividades, "dia", "nombre").valor || undefined,
    }),
    aCodigo: (v) => ({
      mes: v.mes || "",
      anio: num(v.anio) ?? 2026,
      idioma: v.idioma || undefined,
      iniciaEn: v.iniciaEn || undefined,
      ancho: num(v.ancho),
      mostrarFestividades: bool(v.mostrarFestividades) || undefined,
      festividades: pares(v.festividades, "dia", "nombre").valor,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => [
      ...obligatorioTexto(v, "mes", "Mes", "Septiembre"),
      ...obligatorioNum(v, "anio", "Año", "2026"),
    ],
  });
})();
/* ═══════════════════════════════════════════ fin BLOQUE 2 · «calendario» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 3 · «cita» — Cita o frase   [componentes]
   Obligatorio: Cita (texto)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "cita",
    nombre: "Cita o frase",
    cat: "componentes",
    archivo: "componentes/cita.js",
    imports: ["crearCita"],
    funcion: "crearCita",
    descripcion: "Frase destacada con barra morada; admite autor y fuente.",
    params: [
      { k: "texto", et: "Cita", tipo: "area", req: true, formato: true, ej: "Las matemáticas son la *poesía* de las ciencias." },
      { k: "autor", et: "Autor", tipo: "texto", ej: "Lorca" },
      { k: "fuente", et: "Fuente", tipo: "texto", ej: "clase de literatura" },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      autor: v.autor || undefined,
      fuente: v.fuente || undefined,
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "texto", "Cita", "Escribe la frase destacada"),
  });
})();
/* ═════════════════════════════════════════════════ fin BLOQUE 3 · «cita» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 4 · «codigo» — Código / texto tal cual   [componentes]
   Obligatorio: Código
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "codigo",
    nombre: "Código / texto tal cual",
    cat: "componentes",
    archivo: "componentes/codigo.js",
    imports: ["crearCodigo"],
    funcion: "crearCodigo",
    descripcion: "Bloque verbatim (comandos, código, operaciones alineadas).",
    params: [
      { k: "codigo", et: "Código", tipo: "area", req: true, ej: "for i in range(5):\n    print(i)" },
      { k: "lenguaje", et: "Lenguaje (chip)", tipo: "texto", ej: "Python" },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      codigo: v.codigo ?? "",
      lenguaje: v.lenguaje || undefined,
      tamano: num(v.tamano),
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "codigo", "Código", "Escribe aquí el código o texto tal cual"),
  });
})();
/* ═══════════════════════════════════════════════ fin BLOQUE 4 · «codigo» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 5 · «detalles» — Contenido desplegable   [componentes]
   Obligatorio: Rótulo + al menos 1 párrafo (filas; el editor las revisa al guardar)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "detalles",
    nombre: "Contenido desplegable",
    cat: "componentes",
    archivo: "componentes/detalles.js",
    imports: ["crearDetalles"],
    funcion: "crearDetalles",
    descripcion: "Caja plegable: rótulo visible + contenido oculto (soluciones, glosario).",
    params: [
      { k: "titulo", et: "Rótulo", tipo: "texto", req: true, formato: true, ej: "Ver la **solución**" },
      { k: "contenido", et: "Párrafos ocultos", tipo: "repetidor", req: true,
        cuantas: { et: "¿Cuántos párrafos?", def: 2, min: 1, max: 12 },
        columnas: [
          { clave: "contenido", et: "Párrafo", req: true, formato: true, ej: "Paso 1: cuenta de 5 en 5…" },
        ],
        ayuda: "Cada fila es un párrafo dentro de la caja desplegable. Admiten **negrita** y $fórmulas$.",
      },
      { k: "abierto", et: "Arrancar abierto", tipo: "sino" },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      titulo: v.titulo || "",
      contenido: lineas(v.contenido),
      abierto: bool(v.abierto),
      tamano: num(v.tamano),
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "titulo", "Rótulo", "Ver la **solución**"),
  });
})();
/* ═════════════════════════════════════════════ fin BLOQUE 5 · «detalles» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 6 · «encabezado» — Encabezado de clase   [componentes]
   Obligatorio: nada — arranca con Día 1 · Unidad 1 · Lección 1
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "encabezado",
    nombre: "Encabezado de clase",
    cat: "componentes",
    archivo: "componentes/encabezado.js",
    imports: ["crearEncabezado"],
    funcion: "crearEncabezado",
    descripcion: "Chips Día/Unidad/Lección + puntaje de la sesión (arranca en 0).",
    params: [
      { k: "dia", et: "Día", tipo: "num", def: 1 },
      { k: "unidad", et: "Unidad", tipo: "num", def: 1 },
      { k: "leccion", et: "Lección", tipo: "num", def: 1 },
      { k: "puntajeInicial", et: "Puntaje inicial fijo", tipo: "num" },
    ],
    aOpciones: (v, ctx) => ({
      clase: {
        id: ctx.id || "vista-previa",
        dia: num(v.dia) ?? 1,
        unidad: num(v.unidad) ?? 1,
        leccion: num(v.leccion) ?? 1,
      },
      perfil: ctx.perfil,
      puntajeInicial: num(v.puntajeInicial),
    }),
    aCodigo: (v) => ({
      clase: CLASE_RAW,
      perfil: PERFIL_RAW,
      puntajeInicial: num(v.puntajeInicial),
    }),
  });
})();
/* ═══════════════════════════════════════════ fin BLOQUE 6 · «encabezado» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 7 · «enlace» — Enlace / botón   [componentes]
   Obligatorio: Texto visible + Dirección (URL)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "enlace",
    nombre: "Enlace / botón",
    cat: "componentes",
    archivo: "componentes/enlace.js",
    imports: ["crearEnlace"],
    funcion: "crearEnlace",
    descripcion: "Link a otra clase, Drive, video o PDF (texto o botón morado).",
    params: [
      { k: "texto", et: "Texto visible", tipo: "texto", req: true, formato: true, ej: "Hoja de trabajo (PDF)" },
      { k: "url", et: "Dirección (URL)", tipo: "texto", req: true, ej: "https://…" },
      { k: "tipo", et: "Tipo", tipo: "opcion", ops: ["texto", "boton"], def: "texto" },
      { k: "externo", et: "Abrir en pestaña nueva", tipo: "sino", def: true },
      { k: "descarga", et: "Es descarga", tipo: "sino" },
      { k: "nombreArchivo", et: "Nombre del archivo", tipo: "texto" },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      url: v.url || "#",
      tipo: v.tipo || "texto",
      externo: bool(v.externo, true),
      descarga: bool(v.descarga),
      nombreArchivo: v.nombreArchivo || undefined,
      tamano: num(v.tamano),
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => [
      ...obligatorioTexto(v, "texto", "Texto visible", "Hoja de trabajo (PDF)"),
      ...obligatorioTexto(v, "url", "Dirección (URL)", "https://…"),
    ],
  });
})();
/* ═══════════════════════════════════════════════ fin BLOQUE 7 · «enlace» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 8 · «flechas» — Flechas de navegación   [componentes]
   Obligatorio: nada — las etiquetas son opcionales
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "flechas",
    nombre: "Flechas de navegación",
    cat: "componentes",
    archivo: "componentes/flechas.js",
    imports: ["crearFlechas"],
    funcion: "crearFlechas",
    descripcion: "Barra ← Anterior / Siguiente → (conecta las acciones en tu código).",
    params: [
      { k: "etiquetaAnterior", et: "Texto de ←", tipo: "texto", ej: "Anterior" },
      { k: "etiquetaSiguiente", et: "Texto de →", tipo: "texto", ej: "Siguiente" },
      { k: "texto", et: "Texto central", tipo: "texto", ej: "Lámina 2 de 5" },
      { k: "puedeAnterior", et: "← habilitada", tipo: "sino", def: true },
      { k: "puedeSiguiente", et: "→ habilitada", tipo: "sino", def: true },
      { k: "centrado", et: "Barra centrada", tipo: "sino" },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      alAnterior: () => {},
      alSiguiente: () => {},
      etiquetaAnterior: v.etiquetaAnterior || undefined,
      etiquetaSiguiente: v.etiquetaSiguiente || undefined,
      texto: v.texto || undefined,
      puedeAnterior: bool(v.puedeAnterior, true),
      puedeSiguiente: bool(v.puedeSiguiente, true),
      centrado: bool(v.centrado),
      tamano: num(v.tamano),
    }),
    aCodigo: (v) => ({
      alAnterior: { __raw: true, codigo: "() => { /* TODO: acción ← */ }" },
      alSiguiente: { __raw: true, codigo: "() => { /* TODO: acción → */ }" },
      etiquetaAnterior: v.etiquetaAnterior || undefined,
      etiquetaSiguiente: v.etiquetaSiguiente || undefined,
      texto: v.texto || undefined,
      puedeAnterior: bool(v.puedeAnterior, true),
      puedeSiguiente: bool(v.puedeSiguiente, true),
      centrado: bool(v.centrado) || undefined,
      tamano: num(v.tamano),
    }),
  });
})();
/* ══════════════════════════════════════════════ fin BLOQUE 8 · «flechas» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 9 · «formula» — Fórmula destacada   [componentes]
   Obligatorio: Fórmula (LaTeX)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "formula",
    nombre: "Fórmula destacada",
    cat: "componentes",
    archivo: "componentes/formula.js",
    imports: ["crearFormula"],
    funcion: "crearFormula",
    descripcion: "Fórmula grande con KaTeX (LaTeX escolar).",
    params: [
      { k: "latex", et: "Fórmula (LaTeX)", tipo: "area", req: true, ej: "\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}" },
      { k: "bloque", et: "Grande y centrada", tipo: "sino", def: true },
      { k: "tamano", et: "Tamaño (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      latex: v.latex || "",
      bloque: bool(v.bloque, true),
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "latex", "Fórmula (LaTeX)", "x^2 + 1"),
  });
})();
/* ══════════════════════════════════════════════ fin BLOQUE 9 · «formula» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 10 · «formatoTexto» — Texto con formato   [componentes]
   Obligatorio: Texto
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "formatoTexto",
    nombre: "Texto con formato",
    cat: "componentes",
    archivo: "componentes/formatoTexto.js",
    imports: ["crearFormatoTexto"],
    funcion: "crearFormatoTexto",
    descripcion: "Texto libre con TODAS las marcas: **negrita**, $fórmulas$, {{color}}…",
    params: [
      { k: "texto", et: "Texto (con marcas)", tipo: "area", req: true, formato: true, ej: "El agua es H~2~O y el **sulfato** es ==peligroso==. $x^2+1$" },
      { k: "tamano", et: "Tamaño (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "texto", "Texto (con marcas)", "Escribe el texto aquí"),
  });
})();
/* ════════════════════════════════════════ fin BLOQUE 10 · «formatoTexto» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 11 · «imagen» — Imagen con pie   [componentes]
   Obligatorio: Dirección de la imagen
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "imagen",
    nombre: "Imagen con pie",
    cat: "componentes",
    archivo: "componentes/imagen.js",
    imports: ["crearImagen"],
    funcion: "crearImagen",
    descripcion: "Imagen de recursos/img/, Drive o internet + pie de foto.",
    params: [
      { k: "url", et: "Dirección de la imagen", tipo: "texto", req: true, ej: "recursos/img/reloj-clase.png" },
      { k: "alt", et: "Descripción (alt)", tipo: "texto" },
      { k: "pie", et: "Pie de foto", tipo: "texto" },
      { k: "marco", et: "Marco gris", tipo: "sino" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: ["izquierda", "centro", "derecha"] },
    ],
    aOpciones: (v) => ({
      url: v.url || "",
      alt: v.alt || undefined,
      pie: v.pie || undefined,
      marco: bool(v.marco),
      alineacion: v.alineacion || undefined,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "url", "Dirección de la imagen", "recursos/img/figura.png"),
  });
})();
/* ══════════════════════════════════════════════ fin BLOQUE 11 · «imagen» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 12 · «lista» — Lista con viñetas   [componentes]
   Obligatorio: al menos 1 elemento (filas) — el editor lo revisa al guardar
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "lista",
    nombre: "Lista con viñetas",
    cat: "componentes",
    archivo: "componentes/lista.js",
    imports: ["crearLista"],
    funcion: "crearLista",
    descripcion: "Viñetas o numerada; cada elemento admite párrafo y sublistas (JSON).",
    params: [
      { k: "items", et: "Elementos de la lista", tipo: "repetidor", req: true, serializa: "json",
        cuantas: { et: "¿Cuántos elementos?", def: 3, min: 1, max: 30 },
        columnas: [
          { clave: "items", et: "Texto del elemento", req: true, formato: true, json: "texto", ej: "Las manecillas: **hora** y **minuto**." },
          { clave: "items", et: "Párrafo debajo (opcional)", formato: true, json: "parrafo", ej: "El minutero apunta al 12." },
          { clave: "items", et: "Sublista (opcional, separa con |)", formato: true, json: "sublista", ej: "En punto | Y media" },
        ],
        ayuda: "Cada fila es un elemento de la lista (se numeran solas). Si le pones párrafo o sublista, el elemento queda completo en el código.",
      },
      { k: "tipo", et: "Tipo", tipo: "opcion", ops: ["vineta", "numerada"], def: "vineta" },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      items: listaMixta(v.items).valor || [],
      tipo: v.tipo || "vineta",
      tamano: num(v.tamano),
    }),
  });
})();
/* ═══════════════════════════════════════════════ fin BLOQUE 12 · «lista» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 13 · «parrafo» — Párrafo   [componentes]
   Obligatorio: Texto
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "parrafo",
    nombre: "Párrafo",
    cat: "componentes",
    archivo: "componentes/parrafo.js",
    imports: ["crearParrafo"],
    funcion: "crearParrafo",
    descripcion: "Párrafo normal con todo el formato del proyecto.",
    params: [
      { k: "texto", et: "Texto", tipo: "area", req: true, formato: true, ej: "El **minuto** es la manecilla *larga*. Marca las $10{:}30$." },
      { k: "tamano", et: "Tamaño (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "texto", "Texto", "Escribe el párrafo aquí"),
  });
})();
/* ═════════════════════════════════════════════ fin BLOQUE 13 · «parrafo» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 14 · «pasoapaso» — Paso a paso   [componentes]
   Obligatorio: Pasos (JSON) — debe ser una lista [ … ] válida
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "pasoapaso",
    nombre: "Paso a paso",
    cat: "componentes",
    archivo: "componentes/pasoapaso.js",
    imports: ["crearPasoAPaso"],
    funcion: "crearPasoAPaso",
    descripcion: "Revela la solución un paso a la vez con botón Continuar.",
    params: [
      { k: "pasos", et: "Pasos (JSON)", tipo: "area", req: true, ej: '[{"titulo": "Plantea la ecuación", "texto": "2x + 3 = 11"}, {"texto": "Resta 3: $2x = 8$"}, "Divide entre 2: $x = 4$"]' },
      { k: "textoBoton", et: "Texto del botón", tipo: "texto", def: "Continuar" },
      { k: "textoFinal", et: "Texto del botón al terminar", tipo: "texto", def: "¡Listo!" },
      { k: "botonFinal", et: "Botón al terminar", tipo: "opcion", ops: ["deshabilitar", "ocultar"], def: "deshabilitar" },
      { k: "mensajeFinal", et: "Mensaje final", tipo: "area" },
      { k: "mostrarNumeros", et: "Numerar pasos", tipo: "sino", def: true },
      { k: "mostrarProgreso", et: "Mostrar «Paso N de M»", tipo: "sino", def: true },
      { k: "desplazar", et: "Deslizar la página a cada paso", tipo: "sino", def: true },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      pasos: jsonSeguro(v.pasos).valor || [],
      textoBoton: v.textoBoton || undefined,
      textoFinal: v.textoFinal || undefined,
      botonFinal: v.botonFinal || undefined,
      mensajeFinal: v.mensajeFinal || undefined,
      mostrarNumeros: bool(v.mostrarNumeros, true),
      mostrarProgreso: bool(v.mostrarProgreso, true),
      desplazar: bool(v.desplazar, true),
      tamano: num(v.tamano),
    }),
    aCodigo: (v) => ({
      pasos: jsonSeguro(v.pasos).valor,
      textoBoton: v.textoBoton || undefined,
      textoFinal: v.textoFinal || undefined,
      botonFinal: v.botonFinal || undefined,
      mensajeFinal: v.mensajeFinal || undefined,
      mostrarNumeros: bool(v.mostrarNumeros, true),
      mostrarProgreso: bool(v.mostrarProgreso, true),
      desplazar: bool(v.desplazar, true),
      tamano: num(v.tamano),
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioJson(v, "pasos", "Pasos (JSON)",
      '[{"texto": "Paso 1"}, "Paso 2"]', true),
  });
})();
/* ═══════════════════════════════════════════ fin BLOQUE 14 · «pasoapaso» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 15 · «separador» — Separador   [componentes]
   Obligatorio: nada
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "separador",
    nombre: "Separador",
    cat: "componentes",
    archivo: "componentes/separador.js",
    imports: ["crearSeparador"],
    funcion: "crearSeparador",
    descripcion: "Línea, puntos, doble línea o espacio en blanco.",
    params: [
      { k: "estilo", et: "Estilo", tipo: "opcion", ops: ["linea", "puntos", "doble", "espacio"], def: "linea" },
      { k: "alto", et: "Alto del hueco (px, estilo espacio)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      estilo: v.estilo || "linea",
      alto: num(v.alto),
    }),
  });
})();
/* ═══════════════════════════════════════════ fin BLOQUE 15 · «separador» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 16 · «subtitulo» — Subtítulo   [componentes]
   Obligatorio: Texto
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "subtitulo",
    nombre: "Subtítulo",
    cat: "componentes",
    archivo: "componentes/subtitulo.js",
    imports: ["crearSubtitulo"],
    funcion: "crearSubtitulo",
    descripcion: "Encabezado por nivel: orden 1 (h2)… orden 6 (el más pequeño).",
    params: [
      { k: "texto", et: "Texto", tipo: "texto", req: true, formato: true, ej: "1 · La hora **en punto**" },
      { k: "orden", et: "Orden (1–6)", tipo: "num", def: 1 },
      { k: "tamano", et: "Tamaño (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      orden: num(v.orden) ?? 1,
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "texto", "Texto", "Escribe el subtítulo"),
  });
})();
/* ═══════════════════════════════════════════ fin BLOQUE 16 · «subtitulo» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 17 · «svg» — Figura / fondo SVG   [componentes]
   Obligatorio: nada — sin figura ni código sale un rectángulo
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "svg",
    nombre: "Figura / fondo SVG",
    cat: "componentes",
    archivo: "componentes/svg.js",
    imports: ["crearSvg"],
    funcion: "crearSvg",
    descripcion: "Formas tipo Word, líneas, flechas, fondos… o tu propio código <svg>.",
    params: [
      { k: "figura", et: "Figura del catálogo", tipo: "opcion", ops: [], def: "", ej: "" },
      { k: "codigo", et: "…o tu código SVG crudo (con <svg>)", tipo: "area", ej: "<svg viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'/></svg>" },
      { k: "vista", et: "viewBox del SVG crudo SIN etiquetas", tipo: "texto", ej: "0 0 24 24" },
      { k: "alto", et: "Alto (px)", tipo: "num" },
      { k: "color", et: "Color (nombre o hex)", tipo: "texto", ej: "morado · #16a34a" },
      { k: "estilo", et: "Estilo", tipo: "opcion", ops: ["ambos", "borde", "relleno"], def: "ambos" },
      { k: "grosor", et: "Grosor del borde (px)", tipo: "num" },
      { k: "trazo", et: "Trazo", tipo: "opcion", ops: ["solido", "punteado", "guiones"], def: "solido" },
      { k: "opacidadRelleno", et: "Opacidad del relleno (0–1)", tipo: "num" },
      { k: "opacidad", et: "Opacidad de TODA la figura (0–1)", tipo: "num" },
      { k: "centrado", et: "Centrada en su bloque", tipo: "sino" },
      { k: "debajo", et: "Dibujar por debajo del contenido (fondo)", tipo: "sino" },
    ],
    aOpciones: (v) => ({
      figura: v.figura || (v.codigo ? undefined : "rectangulo"),
      codigo: v.codigo || undefined,
      vista: v.vista || undefined,
      alto: num(v.alto),
      color: v.color || undefined,
      estilo: v.estilo || "ambos",
      grosor: num(v.grosor),
      trazo: v.trazo || "solido",
      opacidadRelleno: num(v.opacidadRelleno),
      opacidad: num(v.opacidad),
      centrado: bool(v.centrado) || undefined,
      debajo: bool(v.debajo),
    }),
    aCodigo: (v) => ({
      figura: v.figura || (v.codigo ? undefined : "rectangulo"),
      codigo: v.codigo || undefined,
      vista: v.vista || undefined,
      alto: num(v.alto),
      color: v.color || undefined,
      estilo: v.estilo || "ambos",
      grosor: num(v.grosor),
      trazo: v.trazo || "solido",
      opacidadRelleno: num(v.opacidadRelleno),
      opacidad: num(v.opacidad),
      centrado: bool(v.centrado) || undefined,
      debajo: bool(v.debajo) || undefined,
    }),
  });
})();
/* ═════════════════════════════════════════════════ fin BLOQUE 17 · «svg» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 18 · «tabla» — Tabla   [componentes]
   Obligatorio: Contenido (JSON) — debe ser una lista [ … ] válida
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "tabla",
    nombre: "Tabla",
    cat: "componentes",
    archivo: "componentes/tabla.js",
    imports: ["crearTabla"],
    funcion: "crearTabla",
    descripcion: "Tabla con filas/columnas y soporte de rowspan y colspan (JSON).",
    params: [
      { k: "contenido", et: "Contenido (matriz JSON)", tipo: "area", req: true, ej: '[["Figura", "Lados"], [{"texto": "Cuadrado", "rowspan": 1}, "4"]]' },
      { k: "titulo", et: "Título (caption)", tipo: "texto", formato: true },
      { k: "primeraFila", et: "Primera fila = encabezado", tipo: "sino", def: true },
      { k: "primeraColumna", et: "Primera columna = encabezado", tipo: "sino" },
      { k: "franjas", et: "Filas alternas (zebra)", tipo: "sino", def: true },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      contenido: jsonSeguro(v.contenido).valor || [],
      titulo: v.titulo || undefined,
      primeraFila: bool(v.primeraFila, true),
      primeraColumna: bool(v.primeraColumna),
      franjas: bool(v.franjas, true),
      tamano: num(v.tamano),
    }),
    aCodigo: (v) => ({
      contenido: jsonSeguro(v.contenido).valor,
      titulo: v.titulo || undefined,
      primeraFila: bool(v.primeraFila, true),
      primeraColumna: bool(v.primeraColumna) || undefined,
      franjas: bool(v.franjas, true),
      tamano: num(v.tamano),
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioJson(v, "contenido", "Contenido (matriz JSON)",
      '[["Encabezado", "Col"], ["Dato", "2"]]', true),
  });
})();
/* ═══════════════════════════════════════════════ fin BLOQUE 18 · «tabla» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 19 · «titulo» — Título   [componentes]
   Obligatorio: Texto
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "titulo",
    nombre: "Título",
    cat: "componentes",
    archivo: "componentes/titulo.js",
    imports: ["crearTitulo"],
    funcion: "crearTitulo",
    descripcion: "Título principal del documento (h1).",
    params: [
      { k: "texto", et: "Texto", tipo: "texto", req: true, formato: true, ej: "El **reloj** y el calendario" },
      { k: "tamano", et: "Tamaño (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "texto", "Texto", "Escribe el título"),
  });
})();
/* ══════════════════════════════════════════════ fin BLOQUE 19 · «titulo» ════ */

/* ---------------------- UTILS ---------------------- */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 20 · «blank» — blank — Completar espacios   [utils]
   Obligatorio: Texto con huecos
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "blank",
    nombre: "blank — Completar espacios",
    cat: "utils",
    archivo: "utils/blank.js",
    imports: ["blank"],
    funcion: "blank",
    descripcion: "Texto con huecos [[respuesta]]; al enviar marca buenos/malos.",
    params: [
      { k: "texto", et: "Texto con huecos [[respuesta]] o ___", tipo: "area", req: true, formato: "f", ej: "El agua hierve a [[100]] °C y el símbolo del hierro es ___." },
      { k: "respuestas", et: "Respuestas de los huecos ___", tipo: "repetidor",
        cuantas: { et: "¿Cuántos huecos ___?", def: 2, min: 0, max: 12 },
        columnas: [
          { clave: "respuestas", et: "Respuesta (alternativas con |)", ej: "Fe | hierro" },
        ],
        ayuda: "Cada fila da la respuesta de UN hueco ___, en orden (dentro puedes listar alternativas con |). Los huecos [[con respuesta]] no la necesitan.",
      },
      { k: "puntaje", et: "Puntaje del bloque (0–10)", tipo: "num", def: 1 },
      { k: "mostrarCorrectas", et: "Revelar corrección al enviar (solo examen)", tipo: "sino" },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto", ej: "blank-agua" },
    ],
    aOpciones: (v, ctx) => ({
      texto: v.texto || "",
      respuestas: lineas(v.respuestas).length ? lineas(v.respuestas) : undefined,
      puntaje: num(v.puntaje) ?? 1,
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      texto: v.texto || "",
      respuestas: lineas(v.respuestas).length ? lineas(v.respuestas) : undefined,
      puntaje: num(v.puntaje) ?? 1,
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "texto", "Texto con huecos [[respuesta]] o ___", "El agua hierve a [[100]] °C"),
  });
})();
/* ═══════════════════════════════════════════════ fin BLOQUE 20 · «blank» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 21 · «crucigrama» — crucigrama — Crucigrama   [utils]
   Obligatorio: al menos 2 palabras con su pista (filas) — el editor lo revisa al guardar
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "crucigrama",
    nombre: "crucigrama — Crucigrama",
    cat: "utils",
    archivo: "utils/crucigrama.js",
    imports: ["crucigrama"],
    funcion: "crucigrama",
    descripcion: "Crucigrama único por estudiante con nota al completarlo.",
    params: [
      { k: "palabras", et: "Palabras y pistas", tipo: "repetidor", req: true,
        cuantas: { et: "¿Cuántas palabras?", def: 4, min: 2, max: 15 },
        columnas: [
          { clave: "palabras", et: "PALABRA (sin espacios)", req: true, ej: "ELEFANTE" },
          { clave: "palabras", et: "Pista (admite $fórmulas$)", formato: "f", resto: true, ej: "El animal terrestre más grande" },
        ],
        ayuda: "Cada fila es una palabra del crucigrama con su pista.",
      },
      { k: "puntaje", et: "Puntaje del bloque (0–10)", tipo: "num", def: 2 },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      palabras: pares(v.palabras, "palabra", "pista").valor || [],
      puntaje: num(v.puntaje) ?? 2,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      palabras: pares(v.palabras, "palabra", "pista").valor,
      puntaje: num(v.puntaje) ?? 2,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),
  });
})();
/* ══════════════════════════════════════════ fin BLOQUE 21 · «crucigrama» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 22 · «docsdrive» — docsdrive — Biblioteca Drive   [utils]
   Obligatorio: Documentos (JSON) — debe ser una lista [ … ] válida
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "docsdrive",
    nombre: "docsdrive — Biblioteca Drive",
    cat: "utils",
    archivo: "utils/docsdrive.js",
    imports: ["crearDocsdrive"],
    funcion: "crearDocsdrive",
    descripcion: "Tarjetas de documentos de Drive filtradas por grado, con modal.",
    params: [
      { k: "titulo", et: "Encabezado", tipo: "texto", def: "Recursos" },
      { k: "docs", et: "Documentos (JSON)", tipo: "area", req: true, ej: '[{"enlace": "https://drive.google.com/file/d/ID/view", "materia": "Matemáticas", "grados": [8], "titulo": "Guía de fracciones"}]' },
    ],
    aOpciones: (v, ctx) => ({
      titulo: v.titulo || "Recursos",
      docs: jsonSeguro(v.docs).valor || [],
      grado: (ctx.clase && ctx.clase.grado) || 8,
    }),
    aCodigo: (v) => ({
      titulo: v.titulo || "Recursos",
      docs: jsonSeguro(v.docs).valor,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioJson(v, "docs", "Documentos (JSON)",
      '[{"enlace": "https://…", "titulo": "…", "grados": [8]}]', true),
  });
})();
/* ═══════════════════════════════════════════ fin BLOQUE 22 · «docsdrive» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 23 · «multipleOpcion» — multipleOpcion — Selección múltiple   [utils]
   Obligatorio: Indicación + opciones (filas) con al menos UNA correcta marcada (el editor lo revisa al guardar)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "multipleOpcion",
    nombre: "multipleOpcion — Selección múltiple",
    cat: "utils",
    archivo: "utils/multipleOpcion.js",
    imports: ["multipleOpcion"],
    funcion: "multipleOpcion",
    descripcion: "Marca VARIAS opciones y envía (1 o más correctas).",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, formato: "f", ej: "Marca todos los números pares: $2$, $3$, $4$, $7$." },
      { k: "opciones", et: "Opciones", tipo: "repetidor", req: true,
        cuantas: { et: "¿Cuántas opciones?", def: 4, min: 2, max: 12 },
        columnas: [
          { clave: "opciones", et: "Opción (admite $fórmulas$)", req: true, formato: "f", ej: "$2$" },
        ],
        marca: { tipo: "checks", clave: "correctas", et: "Correcta" },
        ayuda: "Cada fila es una opción; marca con la casilla TODAS las que son correctas (cada fila se numera sola).",
      },
      { k: "puntaje", et: "Puntaje del bloque (0–10)", tipo: "num", def: 1 },
      { k: "penalizarErroneas", et: "Las equivocadas restan", tipo: "sino", def: true },
      { k: "mostrarCorrectas", et: "Revelar correctas al enviar (solo examen)", tipo: "sino" },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      indicacion: v.indicacion || "",
      opciones: lineas(v.opciones),
      correctas: String(v.correctas || "").split(/[\s,]+/).map((t) => Number(t)).filter((n) => Number.isInteger(n) && n > 0),
      puntaje: num(v.puntaje) ?? 1,
      penalizarErroneas: bool(v.penalizarErroneas, true),
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      indicacion: v.indicacion || "",
      opciones: lineas(v.opciones),
      correctas: String(v.correctas || "").split(/[\s,]+/).map((t) => Number(t)).filter((n) => Number.isInteger(n) && n > 0),
      puntaje: num(v.puntaje) ?? 1,
      penalizarErroneas: bool(v.penalizarErroneas, true),
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "indicacion", "Indicación", "Marca todos los números pares"),
  });
})();
/* ══════════════════════════════════════ fin BLOQUE 23 · «multipleOpcion» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 24 · «opcionMultiple» — opcionMultiple — Opción múltiple   [utils]
   Obligatorio: Indicación + respuestas (filas) con UNA correcta marcada (el editor lo revisa al guardar)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "opcionMultiple",
    nombre: "opcionMultiple — Opción múltiple",
    cat: "utils",
    archivo: "utils/opcionMultiple.js",
    imports: ["opcionMultiple"],
    funcion: "opcionMultiple",
    descripcion: "Pregunta con UNA respuesta correcta entre 2 y 6 opciones.",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, formato: "f", ej: "¿Cuánto es $\\frac{3}{4} + \\frac{1}{4}$?" },
      { k: "respuestas", et: "Respuestas", tipo: "repetidor", req: true,
        cuantas: { et: "¿Cuántas respuestas?", def: 4, min: 2, max: 6 },
        columnas: [
          { clave: "respuestas", et: "Respuesta (admite $fórmulas$)", req: true, formato: "f", ej: "$\\frac{1}{2}$" },
        ],
        marca: { tipo: "radio", clave: "respuestaCorrecta", et: "Correcta" },
        ayuda: "Cada fila es una opción y se numera sola. Marca con el círculo CUÁL es la correcta (sin escribir números).",
      },
      { k: "puntaje", et: "Puntaje (0–10)", tipo: "num", def: 1 },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      indicacion: v.indicacion || "",
      respuestas: lineas(v.respuestas),
      respuestaCorrecta: num(v.respuestaCorrecta) ?? 1,
      puntaje: num(v.puntaje) ?? 1,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      indicacion: v.indicacion || "",
      respuestas: lineas(v.respuestas),
      respuestaCorrecta: num(v.respuestaCorrecta) ?? 1,
      puntaje: num(v.puntaje) ?? 1,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "indicacion", "Indicación", "¿Cuánto es 2 + 2?"),
  });
})();
/* ══════════════════════════════════════ fin BLOQUE 24 · «opcionMultiple» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 25 · «ordenar» — ordenar — Ordenar objetos   [utils]
   Obligatorio: Indicación + al menos 2 objetos en orden correcto (filas)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "ordenar",
    nombre: "ordenar — Ordenar objetos",
    cat: "utils",
    archivo: "utils/ordenar.js",
    imports: ["ordenar"],
    funcion: "ordenar",
    descripcion: "Arrastrar objetos a los campos numerados, en su orden correcto.",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, formato: "f", ej: "Ordena de MENOR a MAYOR." },
      { k: "lista", et: "Objetos en orden correcto", tipo: "repetidor", req: true,
        cuantas: { et: "¿Cuántos objetos?", def: 4, min: 2, max: 10 },
        columnas: [
          { clave: "lista", et: "Objeto (EN ORDEN correcto, admite $fórmulas$)", req: true, formato: "f", ej: "$\\frac{1}{4}$" },
        ],
        ayuda: "Cada fila es un objeto; el ORDEN de las filas ES el correcto (la página los muestra mezclados).",
      },
      { k: "distractores", et: "Distractores", tipo: "repetidor",
        cuantas: { et: "¿Cuántos distractores?", def: 0, min: 0, max: 8 },
        columnas: [
          { clave: "distractores", et: "Distractor (no va en ningún campo)", formato: "f", ej: "$\\sqrt{2}$" },
        ],
        ayuda: "Objetos extra que aparecen mezclados pero NO pertenecen a ningún campo. Deja 0 si no quieres.",
      },
      { k: "puntaje", et: "Puntaje del bloque (0–10)", tipo: "num", def: 1 },
      { k: "mostrarCorrectas", et: "Revelar orden al enviar (solo examen)", tipo: "sino" },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      indicacion: v.indicacion || "",
      lista: lineas(v.lista),
      distractores: lineas(v.distractores).length ? lineas(v.distractores) : undefined,
      puntaje: num(v.puntaje) ?? 1,
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      indicacion: v.indicacion || "",
      lista: lineas(v.lista),
      distractores: lineas(v.distractores).length ? lineas(v.distractores) : undefined,
      puntaje: num(v.puntaje) ?? 1,
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "indicacion", "Indicación", "Ordena de MENOR a MAYOR"),
  });
})();
/* ═════════════════════════════════════════════ fin BLOQUE 25 · «ordenar» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 26 · «presentacion» — presentacion — Diapositivas   [utils]
   Obligatorio: Láminas (JSON) — debe ser una lista [ … ] válida
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "presentacion",
    nombre: "presentacion — Diapositivas",
    cat: "utils",
    archivo: "utils/presentacion.js",
    imports: ["crearPresentacion"],
    funcion: "crearPresentacion",
    descripcion: "Láminas tipo diapositiva + botón ⛶ Presentar a ventana completa.",
    params: [
      { k: "laminas", et: "Láminas (JSON)", tipo: "area", req: true, ej: '[{"titulo": "Portada", "texto": "El reloj"}, {"titulo": "Preguntas", "items": ["¿Y la media hora?", "¿Y los minutos?"]}]' },
      { k: "titulo", et: "Título de la presentación", tipo: "texto" },
      { k: "mostrarBoton", et: "Botón ⛶ Presentar", tipo: "sino", def: true },
      { k: "etiquetaBoton", et: "Texto del botón", tipo: "texto", def: "Presentar" },
      { k: "mostrarContador", et: "Mostrar «Lámina 2 de 8»", tipo: "sino", def: true },
    ],
    aOpciones: (v) => ({
      laminas: jsonSeguro(v.laminas).valor || [],
      titulo: v.titulo || undefined,
      mostrarBoton: bool(v.mostrarBoton, true),
      etiquetaBoton: v.etiquetaBoton || undefined,
      mostrarContador: bool(v.mostrarContador, true),
    }),
    aCodigo: (v) => ({
      laminas: jsonSeguro(v.laminas).valor,
      titulo: v.titulo || undefined,
      mostrarBoton: bool(v.mostrarBoton, true),
      etiquetaBoton: v.etiquetaBoton || undefined,
      mostrarContador: bool(v.mostrarContador, true),
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioJson(v, "laminas", "Láminas (JSON)",
      '[{"titulo": "Portada", "texto": "…"}]', true),
  });
})();
/* ════════════════════════════════════════ fin BLOQUE 26 · «presentacion» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 27 · «relacionar» — relacionar — Relacionar columnas   [utils]
   Obligatorio: Indicación + al menos 2 parejas (filas)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "relacionar",
    nombre: "relacionar — Relacionar columnas",
    cat: "utils",
    archivo: "utils/relacionar.js",
    imports: ["relacionar"],
    funcion: "relacionar",
    descripcion: "Dos columnas: forma parejas con clic y envía (imágenes y $fórmulas$).",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, formato: "f", ej: "Relaciona cada figura con su área." },
      { k: "izquierda", et: "Parejas", tipo: "repetidor", req: true,
        cuantas: { et: "¿Cuántas parejas?", def: 3, min: 2, max: 10 },
        columnas: [
          { clave: "izquierda", et: "Tarjeta izquierda", req: true, formato: "f", ej: "Triángulo" },
          { clave: "derecha", et: "Su pareja CORRECTA (derecha)", req: true, formato: "f", ej: "$\\frac{b \\cdot h}{2}$" },
        ],
        ayuda: "Cada fila forma una pareja: la tarjeta izquierda con SU correcta de la derecha. En la página las de la derecha se mezclan.",
      },
      { k: "puntaje", et: "Puntaje del bloque (0–10)", tipo: "num", def: 1 },
      { k: "mostrarCorrectas", et: "Revelar parejas al enviar (solo examen)", tipo: "sino" },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      indicacion: v.indicacion || "",
      izquierda: lineas(v.izquierda),
      derecha: lineas(v.derecha),
      puntaje: num(v.puntaje) ?? 1,
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      indicacion: v.indicacion || "",
      izquierda: lineas(v.izquierda),
      derecha: lineas(v.derecha),
      puntaje: num(v.puntaje) ?? 1,
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "indicacion", "Indicación", "Relaciona cada figura con su área"),
  });
})();
/* ══════════════════════════════════════════ fin BLOQUE 27 · «relacionar» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 28 · «respuestaSimple» — respuestaSimple — Respuesta simple   [utils]
   Obligatorio: Indicación + al menos 1 respuesta (filas)
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "respuestaSimple",
    nombre: "respuestaSimple — Respuesta simple",
    cat: "utils",
    archivo: "utils/respuestaSimple.js",
    imports: ["respuestaSimple"],
    funcion: "respuestaSimple",
    descripcion: "Campo de texto o fórmula; acepta listas de equivalentes.",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, formato: "f", ej: "Escribe el resultado de $8 + 5$." },
      { k: "respuestas", et: "Respuestas (campos del bloque)", tipo: "repetidor", req: true,
        cuantas: { et: "¿Cuántas respuestas?", def: 3, min: 1, max: 20 },
        columnas: [
          { clave: "respuestas", et: "Respuesta correcta", req: true, ej: "Miguel de Cervantes" },
          { clave: "respuestas", et: "También vale (opcional, separa con |)", resto: true, ej: "Cervantes" },
        ],
        etiqueta: { clave: "etiquetas", et: "Etiqueta del campo (opcional)", ej: "Autor" },
        ayuda: "Cada fila es UN campo de respuesta en la página (numerados como lista). «También vale» acepta otras respuestas igual de válidas, separadas por |.",
      },
      { k: "esFormula", et: "La respuesta es una FÓRMULA (teclado matemático)", tipo: "sino" },
      { k: "puntaje", et: "Puntaje (0–10)", tipo: "num", def: 1 },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      indicacion: v.indicacion || "",
      respuestas: lineas(v.respuestas).map((l) => {
        const partes = l.split("|").map((s) => s.trim()).filter(Boolean);
        return partes.length > 1 ? partes : partes[0] ?? "";
      }),
      etiquetas: lineas(v.etiquetas).length ? lineas(v.etiquetas) : undefined,
      esFormula: bool(v.esFormula) || undefined,
      puntaje: num(v.puntaje) ?? 1,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      indicacion: v.indicacion || "",
      respuestas: lineas(v.respuestas).map((l) => {
        const partes = l.split("|").map((s) => s.trim()).filter(Boolean);
        return partes.length > 1 ? partes : partes[0] ?? "";
      }),
      etiquetas: lineas(v.etiquetas).length ? lineas(v.etiquetas) : undefined,
      esFormula: bool(v.esFormula) || undefined,
      puntaje: num(v.puntaje) ?? 1,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "indicacion", "Indicación", "Escribe el resultado de 8 + 5"),
  });
})();
/* ═════════════════════════════════════ fin BLOQUE 28 · «respuestaSimple» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 29 · «sopaLetras» — sopaLetras — Sopa de letras   [utils]
   Obligatorio: al menos 2 palabras (filas) — el editor lo revisa al guardar
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "sopaLetras",
    nombre: "sopaLetras — Sopa de letras",
    cat: "utils",
    archivo: "utils/sopaLetras.js",
    imports: ["sopaLetras"],
    funcion: "sopaLetras",
    descripcion: "Sopa de letras única por estudiante con nota al completarla.",
    params: [
      { k: "palabras", et: "Palabras", tipo: "repetidor", req: true,
        cuantas: { et: "¿Cuántas palabras?", def: 6, min: 2, max: 16 },
        columnas: [
          { clave: "palabras", et: "Palabra", req: true, ej: "GATO" },
        ],
        ayuda: "Cada fila es una palabra que se esconde en la sopa de letras.",
      },
      { k: "puntaje", et: "Puntaje del bloque (0–10)", tipo: "num", def: 2 },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      palabras: lineas(v.palabras),
      puntaje: num(v.puntaje) ?? 2,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      palabras: lineas(v.palabras),
      puntaje: num(v.puntaje) ?? 2,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),
  });
})();
/* ══════════════════════════════════════════ fin BLOQUE 29 · «sopaLetras» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 30 · «tecladoFormulas» — tecladoFormulas — Teclado matemático   [utils]
   Obligatorio: nada
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "tecladoFormulas",
    nombre: "tecladoFormulas — Teclado matemático",
    cat: "utils",
    archivo: "utils/formatearFormulas.js",
    imports: ["crearTecladoFormulas"],
    funcion: "crearTecladoFormulas",
    montaLista: true,   // devuelve { elemento, … }: se agrega .elemento al bloque
    descripcion: "Teclado virtual para escribir LaTeX (avanzado: conéctalo a tu campo).",
    params: [
      { k: "valorInicial", et: "LaTeX inicial", tipo: "texto" },
      { k: "etiqueta", et: "Etiqueta (accesibilidad)", tipo: "texto", ej: "Teclado de fórmulas" },
    ],
    aOpciones: (v) => ({
      valorInicial: v.valorInicial || undefined,
      etiqueta: v.etiqueta || undefined,
    }),
  });
})();
/* ═════════════════════════════════════ fin BLOQUE 30 · «tecladoFormulas» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 31 · «tts» — tts — Leer en voz alta   [utils]
   Obligatorio: Texto que se leerá
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "tts",
    nombre: "tts — Leer en voz alta",
    cat: "utils",
    archivo: "utils/tts.js",
    imports: ["renderTTS"],
    funcion: "renderTTS",
    descripcion: "Reproductor de texto a voz (voces del sistema o voz en línea).",
    params: [
      { k: "texto", et: "Texto que se leerá", tipo: "area", req: true },
      { k: "idioma", et: "Idioma", tipo: "opcion", ops: ["es", "en", "pt", "fr", "it", "de"], def: "es" },
      { k: "titulo", et: "Título del reproductor", tipo: "texto", ej: "Escuchar la lectura" },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      idioma: v.idioma || "es",
      titulo: v.titulo || undefined,
    }),
    // renderTTS(contenedor, idioma, texto, opciones) — llamada posicional
    llamadaEspecial: (v, varBloque) =>
      "renderTTS(" + varBloque + ", " + JSON.stringify(v.idioma || "es") + ", " +
      JSON.stringify(v.texto || "") + ", " + jsSource({ titulo: v.titulo || undefined }, 2).replace(/\n\s+/g, " ") + ");",

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => obligatorioTexto(v, "texto", "Texto que se leerá", "Escribe aquí el texto"),
  });
})();
/* ═════════════════════════════════════════════════ fin BLOQUE 31 · «tts» ════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 32 · «video» — video — Video con preguntas   [utils]
   Obligatorio: Enlace del video + Preguntas (JSON) en lista [ … ] válida
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "video",
    nombre: "video — Video con preguntas",
    cat: "utils",
    archivo: "utils/video.js",
    imports: ["crearVideo"],
    funcion: "crearVideo",
    descripcion: "Se pausa en cada minuto marcado y muestra su pregunta.",
    params: [
      { k: "enlace", et: "Enlace del video", tipo: "texto", req: true, ej: "https://www.youtube.com/watch?v=abc123" },
      { k: "preguntas", et: "Preguntas (JSON)", tipo: "area", req: true, ej: '[{"tiempo": "1:30", "indicacion": "¿Cuánto es $2^3$?", "respuestas": ["6", "8", "9"], "respuestaCorrecta": 2}]' },
      { k: "puntaje", et: "Puntaje TOTAL (se reparte entre preguntas)", tipo: "num", def: 10 },
      { k: "titulo", et: "Encabezado sobre el reproductor", tipo: "texto" },
      { k: "aspecto", et: "Relación de alto", tipo: "texto", ej: "16/9 · 9/16" },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      enlace: v.enlace || "",
      preguntas: jsonSeguro(v.preguntas).valor || [],
      puntaje: num(v.puntaje) ?? 10,
      titulo: v.titulo || undefined,
      aspecto: v.aspecto || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      enlace: v.enlace || "",
      preguntas: jsonSeguro(v.preguntas).valor,
      puntaje: num(v.puntaje) ?? 10,
      titulo: v.titulo || undefined,
      aspecto: v.aspecto || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),

    /* ── A PRUEBA DE ERRORES: lo obligatorio de ESTE bloque ── */
    validar: (v) => [
      ...obligatorioTexto(v, "enlace", "Enlace del video", "https://www.youtube.com/watch?v=abc123"),
      ...obligatorioJson(v, "preguntas", "Preguntas (JSON)",
        '[{"tiempo": "1:30", "indicacion": "¿Cuánto es 2 + 2?", "respuestas": ["3", "4"], "respuestaCorrecta": 1}]', true),
    ],
  });
})();
/* ═══════════════════════════════════════════════ fin BLOQUE 32 · «video» ════ */

/* --------------------- VISUALES --------------------- */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 33 · «reloj» — Reloj de pared   [visuales]
   Obligatorio: nada — arranca a las 12:00
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  REGISTRO.push({
    id: "reloj",
    nombre: "Reloj de pared",
    cat: "visuales",
    archivo: "recursos/js/visuales/reloj.js",
    imports: ["dibujarReloj"],
    funcion: "dibujarReloj",
    descripcion: "Reloj cuadrado con la hora que le pidas (ideal para leer la hora).",
    params: [
      { k: "hora", et: "Hora (0–23)", tipo: "num", def: 12 },
      { k: "minutos", et: "Minutos (0–59)", tipo: "num", def: 0 },
      { k: "tamano", et: "Tamaño (px)", tipo: "num", ej: "220" },
    ],
    aOpciones: (v) => ({
      hora: num(v.hora) ?? 12,
      minutos: num(v.minutos) ?? 0,
      tamano: num(v.tamano),
    }),
  });
})();
/* ═══════════════════════════════════════════════ fin BLOQUE 33 · «reloj» ════ */


/* ============================================================
   ESTADO del editor (solo en el navegador: localStorage)
   ESTRUCTURA v4 — SECCIONES COMO ESPACIOS EN BLANCO:
     estado.opciones     → del DOCUMENTO entero (paginación):
                           avance, tarjeta, mostrarContador,
                           posicionFlechas.
     estado.secciones[]  → la página: cada sección es un ESPACIO
                           EN BLANCO (ancho s.w × alto s.h) y va
                           una debajo de otra EN ORDEN.
     seccion.bloques[]   → los recursos DENTRO del área de esa
                           sección, con (x, y) en px relativos a
                           su espacio (arrastrar de una sección a
                           otra cambia el dueño; nada de JSON).
   ============================================================ */

const CLAVE_BORRADOR = "mco_crear_borrador_v4";
const CLAVE_BORRADOR_V3 = "mco_crear_borrador_v3";   // migración
const ANCHO_LIENZO = 820;   // ancho estándar de la página de clase
const PASO = 10;            // cuadrícula de trabajo (px) y ajuste fino
const ALTO_SECCION = 420;   // alto inicial del ESPACIO de una sección

const PERFIL_DEMO = { uid: "docente-vista-previa", nombre: "Docente (vista previa)", rol: "docente", nie: "" };

// id del recurso «Sección» (no está en el REGISTRO: lo maneja el
// editor de forma nativa, porque las secciones SON el contenedor)
const SECCION_ID = "__seccion__";

let estado = null;        // { tipo, id, titulo, opciones, secciones }
let refUI = null;         // nodos del DOM que se tocan seguido
let contadorUid = 1;
let seccionActiva = null; // uid de la sección donde caen los bloques nuevos

function snap(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n / PASO) * PASO;
}

function opcionesDoc(o) {
  const x = o && typeof o === "object" ? o : {};
  return {
    avance: ["estandar", "lectura", "libre"].includes(x.avance) ? x.avance : "estandar",
    tarjeta: !!x.tarjeta,
    mostrarContador: x.mostrarContador !== false,
    posicionFlechas: x.posicionFlechas === "arriba" ? "arriba" : "abajo",
  };
}

function estadoNuevo() {
  return {
    tipo: "clase",
    id: "",
    titulo: "",
    opciones: opcionesDoc(null),
    secciones: [],
  };
}

function seccionNueva() {
  return {
    uid: "s" + contadorUid++,
    titulo: "",
    w: ANCHO_LIENZO,          // ancho del espacio en blanco
    h: ALTO_SECCION,          // alto del espacio en blanco
    guardado: false,
    medidaOk: false,
    bloques: [],
  };
}

function guardarBorrador() {
  try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(estado)); } catch (e) { /* sin problema */ }
}

// Valida (y si hace falta MIGRA) un borrador guardado.
// esV3=true → el borrador viejo: secciones sin w/h y opciones por
// sección; se convierten al modelo v4 sin perder trabajo.
function normalizarEstado(d, esV3 = false) {
  if (!d || typeof d !== "object" || !Array.isArray(d.secciones)) return null;
  const fuera = estadoNuevo();
  fuera.tipo = ["clase", "tarea", "examen"].includes(d.tipo) ? d.tipo : "clase";
  fuera.id = String(d.id || "");
  fuera.titulo = String(d.titulo || "");

  if (esV3) {
    const primera = d.secciones.find((s) => s && typeof s === "object");
    fuera.opciones = opcionesDoc(primera && primera.opciones);
  } else {
    fuera.opciones = opcionesDoc(d.opciones);
  }

  fuera.secciones = d.secciones
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      const oV3 = esV3 && s.opciones && typeof s.opciones === "object" ? s.opciones : {};
      const hV3 = Number(s.h) || num(oV3.alto) || ALTO_SECCION;
      return {
        uid: String(s.uid || "s" + contadorUid++),
        titulo: String(s.titulo || ""),
        w: esV3 ? ANCHO_LIENZO : Math.min(ANCHO_LIENZO, Math.max(200, Number(s.w) || ANCHO_LIENZO)),
        h: Math.max(80, Math.round(esV3 ? hV3 : (Number(s.h) || ALTO_SECCION))),
        guardado: !!s.guardado,
        medidaOk: false,
        bloques: (Array.isArray(s.bloques) ? s.bloques : [])
          .filter((b) => b && b.recurso && recursoDe(b.recurso))
          .map((b) => ({
            uid: String(b.uid || "b" + contadorUid++),
            recurso: b.recurso,
            x: snap(b.x), y: snap(b.y),
            w: Number(b.w) || null,
            h: Number(b.h) || null,
            valores: b.valores && typeof b.valores === "object" ? b.valores : {},
            guardado: !!b.guardado,
            medidaOk: false,
          })),
      };
    });
  return fuera;
}

function cargarBorrador() {
  try {
    const t = localStorage.getItem(CLAVE_BORRADOR);
    if (t) {
      const d = normalizarEstado(JSON.parse(t), false);
      if (d) return d;
    }
    // borrador de la v3 → se migra (no se pierde el trabajo)
    const viejo = localStorage.getItem(CLAVE_BORRADOR_V3);
    if (viejo) {
      const d = normalizarEstado(JSON.parse(viejo), true);
      if (d) return d;
    }
  } catch (e) { /* borrador dañado → se empieza de cero */ }
  return null;
}

function recursoDe(idRecurso) {
  return REGISTRO.find((r) => r.id === idRecurso) || null;
}

function seccionDe(uid) {
  return estado.secciones.find((s) => s.uid === uid) || null;
}

/* ---------------- carga de módulos (a prueba de todo) ----------------
   1. La URL SIEMPRE se calcula contra RAIZ_JS (la carpeta js/ real,
      según import.meta.url): no depende de dónde esté montado el
      servidor ni de desde qué página se abra el editor.
   2. Si el import falla (caché vieja del navegador, Live Server
      recién arrancado…), se reintenta UNA vez con anti-caché.      */

const MODULOS = new Map();

function moduloDe(recurso) {
  if (!MODULOS.has(recurso.id)) {
    const base = urlDeRecurso(recurso);
    MODULOS.set(
      recurso.id,
      import(base).catch(() => {
        const url = base + (base.includes("?") ? "&" : "?") + "mco=" + Date.now();
        return import(url);
      })
    );
  }
  return MODULOS.get(recurso.id);
}

/* ---------------- diagnóstico de imports (v4) ----------------
   Si un componente no carga, se busca la causa REAL: ¿falta un
   archivo de la cadena (fetch 404) o el archivo está pero falló
   por otro motivo (sintaxis, exportación que no existe, CDN…)?
   El mensaje dice exactamente qué archivo revisar. */

function rutaBonita(url) {
  try { return new URL(url, location.href).pathname; } catch (e) { return String(url); }
}

// Devuelve el mensaje del PRIMER archivo que falta (o null si todo
// está en su lugar y el fallo fue otro: sintaxis, red, CDN…).
async function diagnosticoFalta(urlBase, nivel = 0, vistos = new Set()) {
  let url;
  // mismos apoyos que urlDeRecurso: js/ para el editor,
  // raíz del proyecto para recursos/ (visuales…)
  const base = String(urlBase || "");
  const apoyo = base.startsWith("recursos/") ? RAIZ_APP : RAIZ_JS;
  try { url = new URL(base, apoyo); } catch (e) { return null; }
  const clave = url.pathname;
  if (vistos.has(clave)) return null;
  vistos.add(clave);

  let resp;
  try {
    resp = await fetch(url, { cache: "no-store" });
  } catch (e) {
    return "No se pudo conectar con " + rutaBonita(url) + " (¿el servidor local está encendido?).";
  }
  if (!resp.ok) {
    return "FALTA el archivo " + rutaBonita(url) + " en tu proyecto: cópialo de la entrega y recarga (F5).";
  }
  if (nivel >= 3) return null;   // suficiente profundidad

  let texto = "";
  try { texto = await resp.text(); } catch (e) { return null; }

  const specs = new Set();
  for (const m of texto.matchAll(/from\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
  for (const m of texto.matchAll(/import\s*\(\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);

  for (const s of specs) {
    if (!s.startsWith(".") && !s.startsWith("/")) continue;   // CDN u otros
    const falta = await diagnosticoFalta(new URL(s, url).href, nivel + 1, vistos);
    if (falta) return falta;
  }
  return null;
}

async function mensajeDeError(r, error) {
  const msg = String((error && error.message) || error || "");

  // Caso 1: el archivo está pero NO exporta lo que se espera
  // (copia vieja). Antes esto se confundía con «falta el archivo».
  const sinExport = msg.match(/does not provide an export named\s+['"]?([^'"]+)['"]?/i);
  if (sinExport) {
    return "El archivo de «" + r.nombre + "» SÍ está, pero no exporta «" + sinExport[1] +
      "»: es una copia vieja. Actualiza ese archivo con el de la última entrega y recarga (F5).";
  }

  // Caso 2: falta un archivo de la cadena (fetch 404)
  try {
    const falta = await diagnosticoFalta(r.archivo);
    if (falta) return falta;
  } catch (e) { /* seguimos con el mensaje genérico */ }

  // Caso 3: otra cosa (sintaxis, red, CDN)
  return "No se pudo cargar «" + r.nombre + "»: " + msg +
    ". Revisa la consola con F12; si acabas de actualizar, recarga con F5.";
}

// Toast de aviso (mismo patrón que inicio.js)
function notify(mensaje, variant = "warning") {
  try {
    const alerta = document.createElement("sl-alert");
    alerta.setAttribute("variant", variant);
    alerta.setAttribute("closable", "");
    alerta.setAttribute("duration", "4000");
    alerta.textContent = mensaje;
    document.body.append(alerta);
    customElements.whenDefined("sl-alert").then(() => alerta.toast());
  } catch (e) {
    console.warn("[crear]", mensaje);
  }
}

/* ============================================================
   CSS implícito (convención del proyecto: sin archivos .css)
   ============================================================ */

let estilosListos = false;

function inyectarEstilosCrear() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "crear-estilos";
  estilo.textContent = `
    /* ---------- estructura de 3 divisiones + barra superior ---------- */
    .crear-vista {
      display: flex;
      flex-direction: column;
      height: calc(100dvh - 64px);
      min-height: 480px;
      background: #f4f2fb;
      font-family: system-ui, sans-serif;
      color: #1f2937;
    }

    .crear-barra {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: .5rem;
      padding: .5rem .8rem;
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      box-shadow: 0 2px 10px rgba(17, 12, 46, .05);
      z-index: 6;
    }
    .crear-marca {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      font-weight: 800;
      font-size: 1.02rem;
      color: #7c3aed;
      margin-right: .3rem;
    }
    .crear-campo {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: .6rem;
      padding: .18rem .5rem;
      font-size: .82rem;
      color: #6b7280;
    }
    .crear-campo input, .crear-campo select {
      border: none;
      background: transparent;
      font: inherit;
      font-size: .85rem;
      color: #111827;
      outline: none;
      min-width: 0;
    }
    .crear-campo input { width: 190px; }
    .crear-campo.c-titulo input { width: 150px; }
    .crear-barra .c-crece { flex: 1; }

    .crear-btn {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      color: #4b5563;
      border-radius: .6rem;
      padding: .38rem .7rem;
      font: inherit;
      font-size: .84rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color .15s ease, color .15s ease, background .15s ease;
      white-space: nowrap;
    }
    .crear-btn:hover { border-color: #7c3aed; color: #7c3aed; }
    .crear-btn.primario {
      background: #7c3aed;
      border-color: #7c3aed;
      color: #ffffff;
    }
    .crear-btn.primario:hover { background: #6d28d9; color: #ffffff; }
    .crear-btn.peligro:hover { border-color: #dc2626; color: #dc2626; }

    .crear-cuerpo {
      flex: 1;
      display: flex;
      min-height: 0;
    }

    /* ---------- panel izquierdo: recursos ---------- */
    .crear-izquierda {
      width: 272px;
      min-width: 272px;
      background: #ffffff;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .crz-cab {
      padding: .65rem .8rem .4rem;
      border-bottom: 1px solid #f3f4f6;
    }
    .crz-cab h3 {
      margin: 0 0 .45rem;
      font-size: .82rem;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #9ca3af;
      display: flex;
      align-items: center;
      gap: .3rem;
    }
    .crz-buscar {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #e5e7eb;
      border-radius: .55rem;
      padding: .35rem .55rem;
      font: inherit;
      font-size: .85rem;
      outline: none;
    }
    .crz-buscar:focus { border-color: #a78bfa; }
    .crz-filtros { display: flex; gap: .3rem; margin-top: .45rem; flex-wrap: wrap; }
    .crz-filtro {
      border: 1px solid #e5e7eb;
      background: #ffffff;
      color: #6b7280;
      font: inherit;
      font-size: .72rem;
      font-weight: 700;
      border-radius: 999px;
      padding: .14rem .55rem;
      cursor: pointer;
    }
    .crz-filtro.activo { background: #7c3aed; border-color: #7c3aed; color: #fff; }

    .crz-lista { flex: 1; overflow-y: auto; padding: .5rem .55rem 1.2rem; }
    .crz-item {
      border: 1px solid #ece9f6;
      border-radius: .7rem;
      padding: .5rem .6rem;
      margin-bottom: .45rem;
      background: #ffffff;
      cursor: grab;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .crz-item:hover { border-color: #c4b5fd; box-shadow: 0 3px 12px rgba(124, 58, 237, .1); }
    .crz-item.arrastrando { opacity: .45; }
    .crz-item-top { display: flex; align-items: center; gap: .4rem; }
    .crz-item b { font-size: .86rem; color: #1f2937; flex: 1; }
    .crz-chip {
      font-size: .64rem;
      font-weight: 800;
      padding: .1rem .45rem;
      border-radius: 999px;
      letter-spacing: .03em;
    }
    .crz-chip.componentes { background: rgba(37, 99, 235, .12); color: #2563eb; }
    .crz-chip.utils { background: rgba(22, 163, 74, .12); color: #16a34a; }
    .crz-chip.visuales { background: rgba(124, 58, 237, .12); color: #7c3aed; }
    .crz-item p { margin: .18rem 0 .4rem; font-size: .73rem; color: #9ca3af; line-height: 1.35; }
    .crz-agregar {
      display: inline-flex;
      align-items: center;
      gap: .25rem;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      color: #4b5563;
      font: inherit;
      font-size: .74rem;
      font-weight: 700;
      border-radius: .5rem;
      padding: .2rem .55rem;
      cursor: pointer;
    }
    .crz-agregar:hover { border-color: #7c3aed; color: #7c3aed; background: #faf5ff; }
    .crz-item.crz-fija {
      border: 2px solid #a78bfa;
      background: #faf8ff;
      margin-bottom: .6rem;
    }
    .crz-item.crz-fija b { color: #6d28d9; }
    .crz-chip.seccion { background: rgba(124, 58, 237, .14); color: #6d28d9; }
    @keyframes pulsoSeccion {
      0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, .45); }
      50% { box-shadow: 0 0 0 10px rgba(124, 58, 237, 0); }
    }
    .crz-seccion-pulso { animation: pulsoSeccion 1s ease 2; }

    /* ---------- centro: espacio de trabajo cuadriculado ---------- */
    .crear-centro {
      flex: 1;
      min-width: 0;
      overflow: auto;
      background:
        linear-gradient(#e9e5f8 1px, transparent 1px) 0 0 / 100% 100px,
        linear-gradient(90deg, #e9e5f8 1px, transparent 1px) 0 0 / 100px 100%,
        linear-gradient(#f1eefb 1px, transparent 1px) 0 0 / 100% 20px,
        linear-gradient(90deg, #f1eefb 1px, transparent 1px) 0 0 / 20px 100%,
        #fbfaff;
      padding: 1.1rem 1rem 4rem;
    }
    .crear-hint {
      max-width: ${ANCHO_LIENZO}px;
      margin: 0 auto .7rem;
      font-size: .8rem;
      color: #8b8399;
      line-height: 1.5;
    }
    .crear-hint sl-icon { vertical-align: -3px; margin-right: .25rem; }

    /* ---------- v4: opciones del DOCUMENTO (paginación) ---------- */
    .cr-docopts {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: .5rem 1rem;
      max-width: ${ANCHO_LIENZO}px;
      margin: 0 auto .8rem;
      background: #ffffff;
      border: 1px solid #ece9f6;
      border-radius: 10px;
      padding: .45rem .75rem;
      font-size: .78rem;
      color: #6b7280;
      box-shadow: 0 2px 10px rgba(17, 12, 46, .04);
    }
    .cr-docopts b { color: #6d28d9; font-size: .76rem; text-transform: uppercase; letter-spacing: .05em; }
    .cr-docopts label { display: inline-flex; align-items: center; gap: .3rem; cursor: pointer; white-space: nowrap; }
    .cr-docopts select {
      border: 1px solid #e5e7eb;
      border-radius: .45rem;
      padding: .14rem .3rem;
      font: inherit;
      font-size: .76rem;
      color: #111827;
      background: #ffffff;
      outline: none;
    }
    .cr-docopts input[type="checkbox"] { accent-color: #7c3aed; }

    .crear-pagina {
      position: relative;
      width: ${ANCHO_LIENZO}px;
      margin: 0 auto;
    }
    .cr-pagina-vacia {
      background: #ffffff;
      border: 2px dashed #ddd6fe;
      border-radius: 12px;
      padding: 3rem 1rem !important;
    }

    /* ---------- secciones: ESPACIOS EN BLANCO apilados ---------- */
    .cr-sec {
      border: 2px solid #c4b5fd;
      border-radius: 12px;
      background: #ffffff;
      margin: 0 0 18px;
      box-shadow: 0 8px 26px rgba(17, 12, 46, .08);
      box-sizing: border-box;
      max-width: 100%;
    }
    .cr-sec.activa { border-color: #7c3aed; box-shadow: 0 10px 30px rgba(124, 58, 237, .18); }
    .cr-sec.guardada { border-color: #86efac; }
    .cr-sec.guardada.activa { border-color: #16a34a; }
    .cr-sec-cab {
      display: flex;
      align-items: center;
      gap: .4rem;
      flex-wrap: wrap;
      padding: .42rem .6rem;
      background: #f3efff;
      border-bottom: 1px solid #e9e2fb;
      border-radius: 10px 10px 0 0;
      cursor: pointer;
      user-select: none;
    }
    .cr-sec.guardada .cr-sec-cab { background: #f0fdf4; border-bottom-color: #dcfce7; }
    .cr-sec-nombre {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      font-size: .8rem;
      font-weight: 800;
      color: #6d28d9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 48%;
    }
    .cr-sec-nombre em { font-style: normal; color: #374151; }
    .cr-sec-nombre .candado { color: #16a34a; }
    .cr-sec-medida {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .68rem;
      color: #8b8399;
      background: #ffffff;
      border: 1px solid #ece9f6;
      border-radius: 999px;
      padding: .06rem .5rem;
      white-space: nowrap;
    }
    .cr-bacciones { margin-left: auto; display: inline-flex; gap: .25rem; }
    .cr-bbtn {
      display: inline-flex;
      align-items: center;
      gap: .18rem;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      color: #4b5563;
      font: inherit;
      font-size: .7rem;
      font-weight: 700;
      border-radius: .45rem;
      padding: .16rem .45rem;
      cursor: pointer;
    }
    .cr-bbtn:hover { border-color: #7c3aed; color: #7c3aed; }
    .cr-bbtn.si:hover { border-color: #16a34a; color: #16a34a; }
    .cr-bbtn.no:hover { border-color: #dc2626; color: #dc2626; }
    .cr-bbtn:disabled { opacity: .35; cursor: default; }
    .cr-bbtn:disabled:hover { border-color: #e5e7eb; color: #4b5563; }

    .cr-sec-cuerpo { padding: .55rem .6rem .7rem; }
    .cr-sec-pista { margin: 0 0 .45rem; font-size: .72rem; color: #9ca3af; }
    .cr-sec-vacio {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      margin: 0;
      font-size: .78rem;
      color: #b6aecf;
      pointer-events: none;
      text-align: center;
      padding: 0 1rem;
    }
    .cr-sec-lienzo {
      position: relative;
      /* sangría NEGATIVA: el ESPACIO ocupa el ancho exacto de la
         sección (s.w), sin descontar el padding de la tarjeta — así
         las coordenadas px del editor coinciden con el documento */
      margin: 0 -.6rem -.7rem;
      width: calc(100% + 1.2rem);
      box-sizing: border-box;
      border: 1.5px dashed #ddd6fe;
      border-radius: 0 0 10px 10px;
      background:
        linear-gradient(#efeafb 1px, transparent 1px) 0 0 / 100% 20px,
        linear-gradient(90deg, #efeafb 1px, transparent 1px) 0 0 / 20px 100%,
        #fdfcff;
      transition: border-color .12s ease, background-color .12s ease;
      overflow: visible;
    }
    .cr-sec-lienzo.sobre { border-color: #7c3aed; background-color: #faf8ff; }
    .cr-sec-lienzo.destino { border-color: #16a34a; background-color: #f0fdf4; }
    .cr-form-nota { margin: 0; font-size: .7rem; color: #8b8399; line-height: 1.4; }

    /* ---------- bloques (dentro del espacio de la sección) ---------- */
    .cr-bloque {
      position: absolute;
      border: 2px dashed #a78bfa;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(124, 58, 237, .1);
      box-sizing: border-box;
      min-width: 140px;
    }
    /* GUARDADO = medida EXACTA del documento. El contorno va con
       outline para NO ocupar layout: lo que ves mide lo que dice. */
    .cr-bloque.guardado {
      border: none;
      outline: 2px solid #16a34a;
      outline-offset: -2px;
      box-shadow: 0 4px 14px rgba(22, 163, 74, .12);
    }
    /* borrador SIEMPRE encima (su formulario nunca queda tapado) */
    .cr-bloque.borrador { z-index: 40; }
    .cr-bloque.moviendo, .cr-bloque.redim { box-shadow: 0 12px 30px rgba(124, 58, 237, .28); z-index: 30; }

    .cr-bcab {
      display: flex;
      align-items: center;
      gap: .35rem;
      flex-wrap: wrap;
      padding: .3rem .45rem;
      border-bottom: 1px solid #f1eefb;
      cursor: grab;
      user-select: none;
      touch-action: none;
      background: #faf8ff;
      border-radius: 8px 8px 0 0;
    }
    .cr-bcab:active { cursor: grabbing; }
    .cr-bnombre {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      font-size: .76rem;
      font-weight: 800;
      color: #6d28d9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 40%;
    }
    .cr-bmedida {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .68rem;
      color: #8b8399;
      background: #ffffff;
      border: 1px solid #ece9f6;
      border-radius: 999px;
      padding: .05rem .45rem;
      white-space: nowrap;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cr-bcuerpo { padding: .5rem .6rem .6rem; }
    /* bloque GUARDADO: el contenido real ocupa la tarjeta completa */
    .cr-bloque.guardado .cr-bcuerpo { padding: 0; }
    .cr-breal { pointer-events: none; font-family: system-ui, sans-serif; }
    .cr-breal > * { max-width: 100%; }

    /* tarjeta esperando la medida real */
    .cr-bespera {
      display: flex;
      align-items: center;
      gap: .4rem;
      padding: .8rem .9rem;
      font-size: .75rem;
      color: #8b8399;
    }
    .cr-bespera sl-icon { color: #7c3aed; animation: girar 1.1s linear infinite; }
    @keyframes girar { to { transform: rotate(360deg); } }

    /* tarjeta de error de carga (con diagnóstico y Reintentar) */
    .cr-error-caja {
      border: 2px dashed #dc2626;
      background: #fef2f2;
      color: #b91c1c;
      font-size: .78rem;
      line-height: 1.5;
      padding: .65rem .75rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: .5rem;
      align-items: flex-start;
    }
    .cr-error-caja button {
      border: 1px solid #fca5a5;
      background: #ffffff;
      color: #b91c1c;
      font: inherit;
      font-size: .74rem;
      font-weight: 700;
      border-radius: .5rem;
      padding: .22rem .6rem;
      cursor: pointer;
    }
    .cr-error-caja button:hover { background: #b91c1c; color: #ffffff; border-color: #b91c1c; }

    .cr-form { display: grid; grid-template-columns: 1fr; gap: .45rem; }
    .cr-form label { display: block; font-size: .72rem; font-weight: 700; color: #6b7280; }
    .cr-form label .req { color: #dc2626; margin-left: .15rem; }
    .cr-form label .op { color: #9ca3af; font-weight: 500; }
    .cr-form input, .cr-form select, .cr-form textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #e5e7eb;
      border-radius: .5rem;
      padding: .3rem .45rem;
      font: inherit;
      font-size: .8rem;
      color: #111827;
      outline: none;
      background: #ffffff;
    }
    .cr-form textarea { min-height: 3.2rem; resize: vertical; }
    .cr-form input:focus, .cr-form select:focus, .cr-form textarea:focus { border-color: #a78bfa; }
    .cr-form .error { border-color: #dc2626 !important; background: #fef2f2; }
    .cr-form .fch { display: flex; align-items: center; gap: .4rem; }
    .cr-form .fch input[type="checkbox"] { width: auto; }
    .cr-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: .45rem; }
    .cr-bguardar {
      justify-self: start;
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      background: #16a34a;
      border: 1px solid #16a34a;
      color: #ffffff;
      font: inherit;
      font-size: .78rem;
      font-weight: 800;
      border-radius: .55rem;
      padding: .34rem .8rem;
      cursor: pointer;
    }
    .cr-bguardar:hover { background: #15803d; }

    .cr-resize {
      position: absolute;
      right: -7px;
      bottom: -7px;
      width: 16px;
      height: 16px;
      background: #7c3aed;
      border: 2px solid #ffffff;
      border-radius: 50%;
      cursor: nwse-resize;
      box-shadow: 0 1px 5px rgba(0,0,0,.25);
      touch-action: none;
      z-index: 2;
    }
    .cr-resize.seccion { background: #16a34a; }

    /* ---------- derecha: vista previa real ---------- */
    .crear-derecha {
      width: 40%;
      min-width: 330px;
      background: #ece9f6;
      border-left: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .cv-cab {
      padding: .55rem .8rem;
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: .4rem;
    }
    .cv-cab h3 {
      margin: 0;
      font-size: .82rem;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #9ca3af;
      display: inline-flex;
      align-items: center;
      gap: .3rem;
    }
    .cv-cab .zoom { margin-left: auto; font-size: .72rem; color: #8b8399; }
    .cv-cuerpo { flex: 1; overflow: auto; padding: 1rem; }
    .cv-escena { display: flex; justify-content: center; align-items: flex-start; }
    .cv-pagina {
      width: ${ANCHO_LIENZO}px;
      flex: none;             /* NUNCA encoger: el documento mide 820 */
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(17, 12, 46, .14);
      padding: 1.25rem clamp(1rem, 3vw, 2rem) 2.5rem;
      font-family: system-ui, sans-serif;
      transform-origin: top center;
    }
    .cv-lienzo { position: relative; isolation: isolate; }
    .cv-vacio { text-align: center; color: #8b8399; font-size: .85rem; padding: 3rem 1rem; }

    /* vista previa: láminas y fondos */
    .cv-lamina { position: relative; }
    .cv-bloque { position: absolute; z-index: 1; }
    .cv-bloque.fondo { z-index: 0; }

    /* ---------- modal de código ---------- */
    .cr-modal-fondo {
      position: fixed;
      inset: 0;
      background: rgba(17, 12, 46, .55);
      display: grid;
      place-items: center;
      z-index: 1000;
      padding: 1.2rem;
    }
    .cr-modal {
      width: min(920px, 100%);
      max-height: 92dvh;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 24px 70px rgba(0, 0, 0, .35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .cr-modal-cab {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .75rem 1rem;
      border-bottom: 1px solid #ece9f6;
      font-weight: 800;
      color: #6d28d9;
    }
    .cr-modal-cuerpo { flex: 1; overflow: auto; background: #0f172a; }
    .cr-modal-cuerpo pre {
      margin: 0;
      padding: 1rem 1.2rem;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .78rem;
      line-height: 1.5;
      white-space: pre;
      tab-size: 2;
    }
    .cr-modal-pie {
      display: flex;
      gap: .5rem;
      padding: .7rem 1rem;
      border-top: 1px solid #ece9f6;
      background: #faf8ff;
      flex-wrap: wrap;
    }
    .cr-modal-pie .c-crece { flex: 1; }

    /* ---------- v6: barra de formato + vista previa «Así se ve» ---------- */
    .cr-fmtbar { display: flex; flex-wrap: wrap; gap: .18rem; margin-top: .22rem; }
    .cr-fmt-btn {
      border: 1px solid #e5e7eb; background: #ffffff; color: #4b5563;
      font: inherit; font-size: .68rem; font-weight: 700;
      border-radius: .4rem; padding: .12rem .4rem; cursor: pointer;
      line-height: 1.15; min-width: 1.55rem;
    }
    .cr-fmt-btn:hover { border-color: #7c3aed; color: #7c3aed; background: #faf5ff; }
    .cr-fmt-prev {
      display: flex; align-items: baseline; gap: .45rem;
      margin-top: .22rem; padding: .3rem .55rem;
      background: #faf8ff; border: 1px dashed #ddd6fe; border-radius: .5rem;
      font-size: .8rem; color: #374151; line-height: 1.55;
      max-height: 5rem; overflow: auto;
      overflow-wrap: break-word;
    }
    .cr-fmt-prev-et {
      flex: none;
      font-size: .6rem; font-weight: 800; letter-spacing: .06em;
      text-transform: uppercase; color: #a78bfa;
    }
    .cr-fmt-prev-txt:empty::before { content: "—"; color: #c4b5fd; }

    /* ---------- v6: repetidor «¿Cuántas?» ---------- */
    .cr-rep {
      border: 1px solid #ece9f6; background: #fbfaff;
      border-radius: .6rem; padding: .45rem .5rem .55rem;
    }
    .cr-rep-error { border-color: #dc2626; background: #fef2f2; }
    .cr-rep-top { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .cr-rep-top > label { flex: 1; font-size: .72rem; font-weight: 700; color: #6b7280; }
    .cr-rep-cuantas {
      display: inline-flex; align-items: center; gap: .3rem;
      font-size: .72rem; color: #6b7280; font-weight: 600; white-space: nowrap;
    }
    .cr-rep-cuantas input {
      width: 3.4rem; text-align: center;
      border: 1px solid #e5e7eb; border-radius: .45rem;
      padding: .22rem .3rem; font: inherit; font-size: .8rem; outline: none;
    }
    .cr-rep-cuantas input:focus { border-color: #a78bfa; }
    .cr-rep-cuantas button {
      width: 1.55rem; height: 1.55rem; line-height: 1;
      border: 1px solid #e5e7eb; background: #ffffff; color: #4b5563;
      border-radius: .45rem; font: inherit; font-weight: 800; cursor: pointer;
      display: inline-grid; place-items: center;
    }
    .cr-rep-cuantas button:hover { border-color: #7c3aed; color: #7c3aed; }
    .cr-rep-ayuda { margin: .3rem 0 .4rem; font-size: .68rem; color: #9ca3af; line-height: 1.45; }
    .cr-rep-filas { display: flex; flex-direction: column; gap: .35rem; }
    .cr-rep-fila {
      display: grid; grid-template-columns: auto 1fr auto; gap: .4rem; align-items: start;
      background: #ffffff; border: 1px solid #ece9f6; border-radius: .55rem;
      padding: .34rem .42rem;
    }
    .cr-rep-fila.error { border-color: #dc2626; background: #fef2f2; }
    .cr-rep-num {
      width: 1.3rem; height: 1.3rem; display: grid; place-items: center;
      background: #7c3aed; color: #ffffff; border-radius: 50%;
      font-size: .64rem; font-weight: 800; margin-top: .12rem;
    }
    .cr-rep-celdas { display: grid; gap: .28rem; min-width: 0; }
    .cr-rep-celdas > div > label {
      display: block; font-size: .64rem; font-weight: 700; color: #6b7280;
    }
    .cr-rep-celdas input {
      width: 100%; box-sizing: border-box;
      border: 1px solid #e5e7eb; border-radius: .45rem;
      padding: .24rem .4rem; font: inherit; font-size: .78rem; outline: none;
    }
    .cr-rep-celdas input:focus { border-color: #a78bfa; }
    .cr-rep-marca {
      display: inline-flex; align-items: center; gap: .28rem;
      font-size: .68rem; font-weight: 700; color: #16a34a;
      white-space: nowrap; margin-top: .14rem; cursor: pointer;
    }
    .cr-rep-marca input { accent-color: #16a34a; width: auto; }
    .cr-rep-marca.radio { color: #6d28d9; }
    .cr-rep-marca.radio input { accent-color: #7c3aed; }

    /* ---------- celular: las 3 divisiones se apilan ---------- */
    @media (max-width: 900px) {
      .crear-vista { height: auto; min-height: 0; }
      .crear-cuerpo { flex-direction: column; }
      .crear-izquierda { width: auto; min-width: 0; border-right: none; border-bottom: 1px solid #e5e7eb; }
      .crz-lista { max-height: 40dvh; }
      .crear-centro { overflow: visible; }
      .crear-derecha { width: auto; min-width: 0; border-left: none; border-top: 1px solid #e5e7eb; }
      .cv-cuerpo { overflow: visible; }
      .cr-rep-fila { grid-template-columns: auto 1fr; }
      .cr-rep-marca { grid-column: 2; }
    }
  `;
  document.head.append(estilo);
}

/* ============================================================
   RENDER principal
   ============================================================ */

export function render(perfil, contenedor) {
  if (!perfil || !contenedor) return;
  inyectarEstilosCrear();

  estado = cargarBorrador() || estadoNuevo();
  contenidoTarjetas.clear();
  seccionActiva = estado.secciones.length ? estado.secciones[estado.secciones.length - 1].uid : null;

  contenedor.innerHTML = `
    <div class="crear-vista">

      <!-- ══════════ BARRA SUPERIOR ══════════ -->
      <div class="crear-barra">
        <button class="crear-btn" id="cr-volver" title="Volver al inicio">
          <sl-icon name="arrow-left"></sl-icon> Volver
        </button>
        <span class="crear-marca"><sl-icon name="magic"></sl-icon> Crear</span>

        <label class="crear-campo" title="El id con el que se registra esta clase, tarea o examen">
          <span>ID</span>
          <input id="cr-id" type="text" placeholder="id de la clase/tarea/examen" value="${esc(estado.id)}" />
        </label>

        <label class="crear-campo" title="¿Qué es lo que estás creando?">
          <span>Es</span>
          <select id="cr-tipo">
            <option value="clase">una clase</option>
            <option value="tarea">una tarea</option>
            <option value="examen">un examen</option>
          </select>
        </label>

        <label class="crear-campo c-titulo" title="Título (sale en la barra superior al abrir)">
          <span>Título</span>
          <input id="cr-titulo" type="text" placeholder="Título (opcional)" value="${esc(estado.titulo)}" />
        </label>

        <span class="c-crece"></span>

        <button class="crear-btn peligro" id="cr-vaciar" title="Quitar TODAS las secciones y bloques">
          <sl-icon name="trash"></sl-icon> Vaciar
        </button>
        <button class="crear-btn primario" id="cr-descargar" title="Generar y descargar el código .js de esta pieza">
          <sl-icon name="download"></sl-icon> Descargar código
        </button>
      </div>

      <!-- ══════════ 3 DIVISIONES VERTICALES ══════════ -->
      <div class="crear-cuerpo">

        <!-- 1 · IZQUIERDA: recursos (componentes + utils, alfabético) -->
        <aside class="crear-izquierda">
          <div class="crz-cab">
            <h3><sl-icon name="box"></sl-icon> Recursos</h3>
            <input class="crz-buscar" id="cr-buscar" type="search" placeholder="Buscar recurso…" />
            <div class="crz-filtros" id="cr-filtros">
              <button class="crz-filtro activo" data-cat="todas">Todos</button>
              <button class="crz-filtro" data-cat="componentes">Componentes</button>
              <button class="crz-filtro" data-cat="utils">Utils</button>
              <button class="crz-filtro" data-cat="visuales">Visuales</button>
            </div>
          </div>
          <div class="crz-lista" id="cr-lista"></div>
        </aside>

        <!-- 2 · CENTRO: ÁREA DE TRABAJO = espacios en blanco (secciones) -->
        <section class="crear-centro" id="cr-centro">
          <p class="crear-hint">
            <sl-icon name="layers"></sl-icon>
            <b>1)</b> Agrega una <b>Sección</b>: es un ESPACIO EN BLANCO del tamaño que le des
            (sin secciones no se puede agregar nada).
            <b>2)</b> Suelta o agrega bloques <b>dentro de su área</b>: todo lo que caiga
            dentro pertenece a esa sección (arrastra entre secciones para cambiar de dueño).
            <b>3)</b> Con <b>1 sección</b> el documento queda corrido; con <b>2 o más</b>
            se avanza con <b>Siguiente</b>.
          </p>

          <div class="cr-docopts" id="cr-docopts">
            <b>Documento</b>
            <label title="«Siguiente» normal · aparece al terminar de leer · todas visibles">
              Avance
              <select id="cr-avance">
                <option value="estandar">estándar</option>
                <option value="lectura">al terminar de leer</option>
                <option value="libre">siempre visibles</option>
              </select>
            </label>
            <label title="Cada lámina dentro de una tarjeta con borde">
              <input type="checkbox" id="cr-tarjeta" /> Tarjeta
            </label>
            <label title="Mostrar «2 / 5» entre las flechas">
              <input type="checkbox" id="cr-contador" /> Contador «2 / 5»
            </label>
            <label title="Dónde van las flechas Anterior/Siguiente">
              Flechas
              <select id="cr-posflechas">
                <option value="abajo">abajo</option>
                <option value="arriba">arriba</option>
              </select>
            </label>
          </div>

          <div class="crear-pagina" id="cr-pagina"></div>
        </section>

        <!-- 3 · DERECHA: vista previa exacta (crearSecciones real) -->
        <aside class="crear-derecha">
          <div class="cv-cab">
            <h3><sl-icon name="eye"></sl-icon> Vista previa</h3>
            <span class="zoom" id="cr-zoom"></span>
          </div>
          <div class="cv-cuerpo" id="cv-cuerpo">
            <div class="cv-escena" id="cv-escena">
              <div class="cv-pagina" id="cv-pagina">
                <div class="cv-lienzo" id="cv-lienzo"></div>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>`;

  refUI = {
    raiz: contenedor.querySelector(".crear-vista"),
    id: contenedor.querySelector("#cr-id"),
    tipo: contenedor.querySelector("#cr-tipo"),
    titulo: contenedor.querySelector("#cr-titulo"),
    buscar: contenedor.querySelector("#cr-buscar"),
    filtros: contenedor.querySelector("#cr-filtros"),
    lista: contenedor.querySelector("#cr-lista"),
    centro: contenedor.querySelector("#cr-centro"),
    pagina: contenedor.querySelector("#cr-pagina"),
    cvCuerpo: contenedor.querySelector("#cv-cuerpo"),
    cvEscena: contenedor.querySelector("#cv-escena"),
    cvPagina: contenedor.querySelector("#cv-pagina"),
    cvLienzo: contenedor.querySelector("#cv-lienzo"),
    zoom: contenedor.querySelector("#cr-zoom"),
  };
  refUI.tipo.value = estado.tipo;

  let filtroCat = "todas";

  /* ---------- barra superior ---------- */
  contenedor.querySelector("#cr-volver").addEventListener("click", () => {
    renderInicio(perfil, contenedor);
  });

  refUI.id.addEventListener("input", () => { estado.id = refUI.id.value.trim(); guardarBorrador(); });
  refUI.tipo.addEventListener("change", () => { estado.tipo = refUI.tipo.value; guardarBorrador(); renderizarPreview(); });
  refUI.titulo.addEventListener("input", () => { estado.titulo = refUI.titulo.value.trim(); guardarBorrador(); });

  contenedor.querySelector("#cr-vaciar").addEventListener("click", () => {
    if (!estado.secciones.length) return;
    if (!confirm("¿Vaciar la página? Se quitan TODAS las secciones y sus bloques (no se puede deshacer).")) return;
    estado.secciones = [];
    contenidoTarjetas.clear();
    seccionActiva = null;
    guardarBorrador();
    dibujarPagina();
    renderizarPreview();
  });

  contenedor.querySelector("#cr-descargar").addEventListener("click", () => {
    abrirModalCodigo();
  });

  /* ---------- opciones del DOCUMENTO (paginación) ---------- */
  const selAvance = contenedor.querySelector("#cr-avance");
  const chkTarjeta = contenedor.querySelector("#cr-tarjeta");
  const chkContador = contenedor.querySelector("#cr-contador");
  const selFlechas = contenedor.querySelector("#cr-posflechas");
  selAvance.value = estado.opciones.avance;
  chkTarjeta.checked = estado.opciones.tarjeta;
  chkContador.checked = estado.opciones.mostrarContador;
  selFlechas.value = estado.opciones.posicionFlechas;

  selAvance.addEventListener("change", () => {
    estado.opciones.avance = selAvance.value;
    guardarBorrador();
    renderizarPreview();
  });
  chkTarjeta.addEventListener("change", () => {
    estado.opciones.tarjeta = chkTarjeta.checked;
    guardarBorrador();
    renderizarPreview();
  });
  chkContador.addEventListener("change", () => {
    estado.opciones.mostrarContador = chkContador.checked;
    guardarBorrador();
    renderizarPreview();
  });
  selFlechas.addEventListener("change", () => {
    estado.opciones.posicionFlechas = selFlechas.value;
    guardarBorrador();
    renderizarPreview();
  });

  /* ---------- soltar en el CENTRO: secciones sí, bloques no ---------- */
  refUI.centro.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    marcarDestino(e);
  });
  refUI.centro.addEventListener("dragleave", () => limpiarDestinos());
  refUI.centro.addEventListener("drop", (e) => {
    const idR = e.dataTransfer.getData("text/mco-recurso") || e.dataTransfer.getData("text/plain");
    limpiarDestinos();
    if (!idR) return;
    e.preventDefault();
    if (idR === SECCION_ID) { agregarSeccion(); return; }
    // un bloque suelto FUERA de una sección NO se puede: va DENTRO del área
    notify("Los bloques van DENTRO del espacio en blanco de una sección: suéltalo dentro del área morada.", "warning");
    resaltarSeccionActiva();
  });

  /* ---------- panel izquierdo ---------- */
  refUI.buscar.addEventListener("input", () => listarRecursos(filtroCat));
  refUI.filtros.querySelectorAll(".crz-filtro").forEach((b) => {
    b.addEventListener("click", () => {
      filtroCat = b.dataset.cat;
      refUI.filtros.querySelectorAll(".crz-filtro").forEach((x) => x.classList.toggle("activo", x === b));
      listarRecursos(filtroCat);
    });
  });

  listarRecursos("todas");
  dibujarPagina();
  // la vista previa TAMBIÉN mide: al terminar se ajustan las tarjetas
  renderizarPreview().then(() => {
    sincronizarTarjetas();
    dibujarPagina();
  });
}

/* ============================================================
   PANEL IZQUIERDO — SECCIÓN fija arriba + recursos alfabéticos
   ============================================================ */

let cascade = 0;

function tarjetaSeccionHtml() {
  return `
    <div class="crz-item crz-fija" draggable="true" data-recurso="${SECCION_ID}"
         title="Arrástrala a la página o pulsa Agregar sección">
      <div class="crz-item-top">
        <b><sl-icon name="layers" style="vertical-align:-2px"></sl-icon> SECCIÓN — espacio en blanco</b>
        <span class="crz-chip seccion">base</span>
      </div>
      <p>Un ESPACIO del tamaño que le des: todo lo que coloques dentro de su área pertenece a esa sección. Con 1 sección el documento corre; con 2 o más, avanza con Siguiente.</p>
      <button class="crz-agregar" data-agregar="${SECCION_ID}">
        <sl-icon name="plus-lg"></sl-icon> Agregar sección
      </button>
    </div>`;
}

function listarRecursos(categoria) {
  const q = (refUI.buscar.value || "").toLowerCase().trim();
  const items = REGISTRO
    .filter((r) => categoria === "todas" || r.cat === categoria)
    .filter((r) => !q || (r.nombre + " " + r.descripcion + " " + r.id).toLowerCase().includes(q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  refUI.lista.innerHTML =
    tarjetaSeccionHtml() +
    (items.length
      ? items.map((r) => `
      <div class="crz-item" draggable="true" data-recurso="${esc(r.id)}" title="Arrástralo DENTRO del área de una sección o pulsa Agregar">
        <div class="crz-item-top">
          <b>${esc(r.nombre)}</b>
          <span class="crz-chip ${esc(r.cat)}">${r.cat === "visuales" ? "visual" : esc(r.cat).replace(/s$/, "")}</span>
        </div>
        <p>${esc(r.descripcion)}</p>
        <button class="crz-agregar" data-agregar="${esc(r.id)}">
          <sl-icon name="plus-lg"></sl-icon> Agregar
        </button>
      </div>`).join("")
      : `<p style="color:#9ca3af;font-size:.82rem;padding:.4rem .3rem;">Ningún recurso coincide con la búsqueda.</p>`);

  // Arrastrar hacia el área de trabajo (drag & drop)
  refUI.lista.querySelectorAll(".crz-item").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/mco-recurso", el.dataset.recurso);
      e.dataTransfer.setData("text/plain", el.dataset.recurso);
      e.dataTransfer.effectAllowed = "copy";
      el.classList.add("arrastrando");
    });
    el.addEventListener("dragend", () => el.classList.remove("arrastrando"));
  });

  // Botón Agregar: la sección se agrega a la página; los demás
  // recursos entran en la sección ACTIVA (o la última que haya)
  refUI.lista.querySelectorAll("[data-agregar]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const idR = b.dataset.agregar;
      if (idR === SECCION_ID) { agregarSeccion(); return; }
      const s = seccionDe(seccionActiva) || estado.secciones[estado.secciones.length - 1];
      if (!s) {
        notify("Primero agrega una SECCIÓN: los bloques van dentro del espacio de una sección.", "warning");
        resaltarTarjetaSeccion();
        return;
      }
      const x = 30 + (cascade % 5) * 26;
      const y = 24 + (cascade % 5) * 30;
      cascade++;
      agregarBloque(idR, s, x, y);
    });
  });
}

/* ============================================================
   ÁREA DE TRABAJO — pila de SECCIONES (espacios en blanco)
   ============================================================ */

function agregarSeccion() {
  const s = seccionNueva();
  estado.secciones.push(s);
  seccionActiva = s.uid;
  guardarBorrador();
  dibujarPagina();
  const el = refUI.pagina.querySelector('[data-sec="' + s.uid + '"]');
  if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function agregarBloque(idRecurso, seccion, x, y) {
  const r = recursoDe(idRecurso);
  if (!r || !seccion || !refUI) return;
  const valores = {};
  (r.params || []).forEach((p) => { valores[p.k] = p.def !== undefined ? p.def : ""; });
  const b = {
    uid: "b" + contadorUid++,
    recurso: r.id,
    x: snap(Math.min(Math.max(0, x), Math.max(0, seccion.w - 80))),
    y: snap(Math.max(0, y)),
    w: null, h: null,          // null = bloque entero / alto natural
    valores,
    guardado: false,
    medidaOk: false,
  };
  seccion.bloques.push(b);
  seccionActiva = seccion.uid;
  guardarBorrador();
  dibujarPagina();
  const el = refUI.pagina.querySelector('[data-uid="' + b.uid + '"]');
  if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function textoMedida(b) {
  const w = b.w ? b.w + "px" : "entero";
  const h = b.h ? b.h + "px" : "auto";
  return "x " + b.x + " · y " + b.y + " · " + w + " × " + h;
}

function textoMedidaSeccion(s, indice) {
  const guardados = s.bloques.filter((b) => b.guardado).length;
  return "Sección " + (indice + 1) + " · " + s.w + "×" + s.h + " px · " +
    guardados + " bloque" + (guardados === 1 ? "" : "s");
}

function dibujarPagina() {
  if (!refUI) return;
  const P = refUI.pagina;
  P.innerHTML = "";

  if (!estado.secciones.length) {
    const vacio = document.createElement("div");
    vacio.className = "cv-vacio cr-pagina-vacia";
    vacio.innerHTML =
      'El área de trabajo está vacía.<br/><b>Agrega una SECCIÓN</b> para empezar: ' +
      "es un espacio en blanco — todos los bloques van dentro de una sección.";
    const btn = document.createElement("button");
    btn.className = "crear-btn primario";
    btn.style.marginTop = ".8rem";
    btn.innerHTML = '<sl-icon name="plus-lg"></sl-icon> Agregar la primera sección';
    btn.addEventListener("click", () => agregarSeccion());
    vacio.appendChild(document.createElement("div"));
    vacio.lastChild.appendChild(btn);
    P.appendChild(vacio);
    return;
  }

  estado.secciones.forEach((s, i) => P.appendChild(seccionEl(s, i)));
}

/* Resalta (durante un arrastre desde el panel) la sección bajo el
   puntero: el DESTINO real donde caería el bloque. */
function marcarDestino(e) {
  const s = seccionBajoPuntero(e.clientX, e.clientY);
  refUI.pagina.querySelectorAll(".cr-sec-lienzo").forEach((el) => {
    el.classList.toggle("sobre", !!s && el.dataset.sec === s.uid);
  });
}

function limpiarDestinos() {
  if (!refUI) return;
  refUI.pagina.querySelectorAll(".cr-sec-lienzo.sobre").forEach((el) => el.classList.remove("sobre"));
}

// La sección cuyo ESPACIO (lienzo) contiene el punto del navegador.
function seccionBajoPuntero(clientX, clientY) {
  const lienzos = refUI ? [...refUI.pagina.querySelectorAll(".cr-sec-lienzo")] : [];
  for (let i = lienzos.length - 1; i >= 0; i--) {
    const r = lienzos[i].getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return seccionDe(lienzos[i].dataset.sec);
    }
  }
  return null;
}

function resaltarTarjetaSeccion() {
  const card = refUI.lista && refUI.lista.querySelector('[data-recurso="' + SECCION_ID + '"]');
  if (!card) return;
  card.classList.remove("crz-seccion-pulso");
  void card.offsetWidth;
  card.classList.add("crz-seccion-pulso");
  card.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function resaltarSeccionActiva() {
  const s = seccionDe(seccionActiva) || estado.secciones[estado.secciones.length - 1];
  if (!s) return;
  const el = refUI.pagina.querySelector('[data-sec="' + s.uid + '"]');
  if (!el) return;
  el.classList.remove("crz-seccion-pulso");
  void el.offsetWidth;
  el.classList.add("crz-seccion-pulso");
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* ---------------- tarjeta de sección (ESPACIO EN BLANCO) ---------------- */

// Alto visual del espacio: el que se pidió… o el que pide el contenido.
function altoLienzo(s) {
  const contenido = s.bloques.reduce((m, b) => Math.max(m, b.y + (b.h || 200)), 0);
  return Math.max(s.h, contenido, 120);
}

function seccionEl(s, indice) {
  const activa = s.uid === seccionActiva;

  const el = document.createElement("div");
  el.className = "cr-sec" + (activa ? " activa" : "") + (s.guardado ? " guardada" : "");
  el.dataset.sec = s.uid;
  el.style.width = (s.w + 4) + "px";   // +4 = los bordes: el ESPACIO mide s.w exacto

  /* ---- cabecera: todo EN EL FLUJO (nunca botones fuera de vista) ---- */
  const cab = document.createElement("div");
  cab.className = "cr-sec-cab";

  const nombre = document.createElement("span");
  nombre.className = "cr-sec-nombre";
  nombre.innerHTML = '<sl-icon name="layers"></sl-icon> Sección ' + (indice + 1) +
    (s.titulo ? ' · <em>' + esc(s.titulo) + '</em>' : "") +
    (s.guardado ? ' <sl-icon name="lock" class="candado"></sl-icon>' : "");
  cab.appendChild(nombre);

  const medida = document.createElement("span");
  medida.className = "cr-sec-medida";
  medida.textContent = textoMedidaSeccion(s, indice);
  cab.appendChild(medida);

  const acciones = document.createElement("span");
  acciones.className = "cr-bacciones";

  const subir = document.createElement("button");
  subir.className = "cr-bbtn";
  subir.title = "Subir esta sección";
  subir.innerHTML = '<sl-icon name="arrow-up"></sl-icon>';
  subir.disabled = indice === 0;
  subir.addEventListener("click", (e) => { e.stopPropagation(); moverSeccion(indice, -1); });
  acciones.appendChild(subir);

  const bajar = document.createElement("button");
  bajar.className = "cr-bbtn";
  bajar.title = "Bajar esta sección";
  bajar.innerHTML = '<sl-icon name="arrow-down"></sl-icon>';
  bajar.disabled = indice === estado.secciones.length - 1;
  bajar.addEventListener("click", (e) => { e.stopPropagation(); moverSeccion(indice, 1); });
  acciones.appendChild(bajar);

  if (s.guardado) {
    const editar = document.createElement("button");
    editar.className = "cr-bbtn si";
    editar.title = "Editar título y tamaño de esta sección";
    editar.innerHTML = '<sl-icon name="pencil"></sl-icon> Editar';
    editar.addEventListener("click", (e) => {
      e.stopPropagation();
      s.guardado = false;
      s.medidaOk = false;
      guardarBorrador();
      dibujarPagina();
    });
    acciones.appendChild(editar);
  }

  const eliminar = document.createElement("button");
  eliminar.className = "cr-bbtn no";
  eliminar.title = "Eliminar esta sección y SUS bloques";
  eliminar.innerHTML = '<sl-icon name="trash"></sl-icon>';
  eliminar.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar la Sección " + (indice + 1) + " y TODOS sus bloques?")) return;
    s.bloques.forEach((b) => contenidoTarjetas.delete(b.uid));
    estado.secciones = estado.secciones.filter((x) => x.uid !== s.uid);
    if (seccionActiva === s.uid) {
      seccionActiva = estado.secciones.length ? estado.secciones[estado.secciones.length - 1].uid : null;
    }
    guardarBorrador();
    dibujarPagina();
    renderizarPreview();
  });
  acciones.appendChild(eliminar);

  cab.appendChild(acciones);
  el.appendChild(cab);

  // clic en la tarjeta → sección activa (los bloques nuevos caen aquí)
  el.addEventListener("click", () => {
    if (seccionActiva === s.uid) return;
    seccionActiva = s.uid;
    dibujarPagina();
  });

  /* ---- cuerpo: formulario (si no está guardada) + EL ESPACIO ---- */
  const cuerpo = document.createElement("div");
  cuerpo.className = "cr-sec-cuerpo";

  if (!s.guardado) {
    cuerpo.appendChild(formularioSeccion(s, { tarjeta: el, medida, nombre }));
  }

  const pista = document.createElement("p");
  pista.className = "cr-sec-pista";
  pista.innerHTML = s.bloques.length
    ? "ESPACIO de la sección (px): suelta recursos aquí o usa <b>Agregar</b> de la izquierda — todo lo que caiga aquí queda dentro de esta sección."
    : "ESPACIO en blanco de " + s.w + "×" + s.h + " px: suelta aquí un recurso de la izquierda o pulsa <b>Agregar</b>.";
  cuerpo.appendChild(pista);

  const lienzo = document.createElement("div");
  lienzo.className = "cr-sec-lienzo";
  lienzo.dataset.sec = s.uid;
  lienzo.style.minHeight = altoLienzo(s) + "px";

  // soltar recursos DENTRO del espacio de esta sección
  lienzo.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    lienzo.classList.add("sobre");
  });
  lienzo.addEventListener("dragleave", () => lienzo.classList.remove("sobre"));
  lienzo.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();          // el centro NO vuelve a procesarlo
    lienzo.classList.remove("sobre");
    const idR = e.dataTransfer.getData("text/mco-recurso") || e.dataTransfer.getData("text/plain");
    if (!idR) return;
    if (idR === SECCION_ID) {
      notify("Las secciones van una debajo de otra (no dentro de otra).", "warning");
      return;
    }
    if (!recursoDe(idR)) return;
    const rectL = lienzo.getBoundingClientRect();
    agregarBloque(idR, s, e.clientX - rectL.left - 60, e.clientY - rectL.top - 24);
  });

  if (!s.bloques.length) {
    const vacio = document.createElement("p");
    vacio.className = "cr-sec-vacio";
    vacio.textContent = "Espacio en blanco — todo lo que coloques aquí va dentro de la sección.";
    lienzo.appendChild(vacio);
  } else {
    s.bloques.forEach((b) => lienzo.appendChild(bloqueEl(b, s)));
  }

  /* ---- manija para cambiar el TAMAÑO del espacio en blanco ---- */
  const manija = document.createElement("div");
  manija.className = "cr-resize seccion";
  manija.title = "Arrastra para cambiar el tamaño del espacio (ancho × alto)";
  activarRedimensionSeccion(manija, s, el, lienzo, medida, indice);
  lienzo.appendChild(manija);

  cuerpo.appendChild(lienzo);
  el.appendChild(cuerpo);
  return el;
}

function moverSeccion(indice, delta) {
  const nuevo = indice + delta;
  if (nuevo < 0 || nuevo >= estado.secciones.length) return;
  const [s] = estado.secciones.splice(indice, 1);
  estado.secciones.splice(nuevo, 0, s);
  guardarBorrador();
  dibujarPagina();
  renderizarPreview();
}

/* ---------------- formulario de la sección ---------------- */

function formularioSeccion(s, refs) {
  const form = document.createElement("div");
  form.className = "cr-form cr-form-seccion";

  const aviso = document.createElement("p");
  aviso.className = "cr-form-nota";
  aviso.innerHTML = "El <b>título</b> es solo para orientarte en el editor. El tamaño del ESPACIO se cambia arrastrando la bolita verde (o aquí abajo).";
  form.appendChild(aviso);

  // título (solo interno) — ancho y alto del espacio en 2 columnas
  const fila = document.createElement("div");
  fila.className = "cr-form-2col";

  const envAncho = document.createElement("div");
  const etAncho = document.createElement("label");
  etAncho.innerHTML = 'Ancho del espacio (px) <span class="op">200–820</span>';
  envAncho.appendChild(etAncho);
  const inAncho = document.createElement("input");
  inAncho.type = "number";
  inAncho.step = "10";
  inAncho.min = "200";
  inAncho.max = String(ANCHO_LIENZO);
  inAncho.value = s.w;
  inAncho.addEventListener("input", () => {
    const v = num(inAncho.value);
    if (v === undefined) return;
    s.w = Math.min(ANCHO_LIENZO, Math.max(200, Math.round(v)));
    if (refs && refs.tarjeta) refs.tarjeta.style.width = (s.w + 4) + "px";
    if (refs && refs.medida) refs.medida.textContent = textoMedidaSeccion(s, estado.secciones.indexOf(s));
    guardarBorrador();
  });
  envAncho.appendChild(inAncho);
  fila.appendChild(envAncho);

  const envAlto = document.createElement("div");
  const etAlto = document.createElement("label");
  etAlto.innerHTML = 'Alto del espacio (px) <span class="op">mínimo 80</span>';
  envAlto.appendChild(etAlto);
  const inAlto = document.createElement("input");
  inAlto.type = "number";
  inAlto.step = "10";
  inAlto.min = "80";
  inAlto.value = s.h;
  inAlto.addEventListener("input", () => {
    const v = num(inAlto.value);
    if (v === undefined) return;
    s.h = Math.max(80, Math.round(v));
    const lienzo = refUI && refUI.pagina.querySelector('.cr-sec-lienzo[data-sec="' + s.uid + '"]');
    if (lienzo) lienzo.style.minHeight = altoLienzo(s) + "px";
    if (refs && refs.medida) refs.medida.textContent = textoMedidaSeccion(s, estado.secciones.indexOf(s));
    guardarBorrador();
  });
  envAlto.appendChild(inAlto);
  fila.appendChild(envAlto);
  form.appendChild(fila);

  const envTitulo = document.createElement("div");
  const etTitulo = document.createElement("label");
  etTitulo.innerHTML = 'Título de la sección (solo para ti) <span class="op">(opcional)</span>';
  envTitulo.appendChild(etTitulo);
  const inTitulo = document.createElement("input");
  inTitulo.type = "text";
  inTitulo.value = valorCampo(s.titulo);
  inTitulo.placeholder = "Portada · Práctica · Cierre";
  inTitulo.addEventListener("input", () => {
    s.titulo = inTitulo.value.trim();
    if (refs && refs.nombre) {
      refs.nombre.innerHTML = '<sl-icon name="layers"></sl-icon> Sección ' +
        (estado.secciones.indexOf(s) + 1) +
        (s.titulo ? ' · <em>' + esc(s.titulo) + '</em>' : "") +
        (s.guardado ? ' <sl-icon name="lock" class="candado"></sl-icon>' : "");
    }
    guardarBorrador();
  });
  envTitulo.appendChild(inTitulo);
  form.appendChild(envTitulo);

  const guardar = document.createElement("button");
  guardar.className = "cr-bguardar";
  guardar.innerHTML = '<sl-icon name="lock"></sl-icon> Guardar sección (bloquear)';
  guardar.addEventListener("click", () => guardarSeccion(s));
  form.appendChild(guardar);

  return form;
}

async function guardarSeccion(s) {
  s.guardado = true;
  s.medidaOk = false;
  guardarBorrador();
  dibujarPagina();

  // montar de verdad en la vista previa y MEDIR los bloques
  await renderizarPreview();
  sincronizarTarjetas();
  dibujarPagina();

  notify("Sección guardada: su espacio mide " + s.w + " × " + s.h + " px.", "success");
}

/* ============================================================
   BLOQUES (dentro del espacio de una sección)
   ============================================================ */

function bloqueEl(b, seccion) {
  const r = recursoDe(b.recurso);
  const guardado = !!b.guardado;

  const el = document.createElement("div");
  el.className = "cr-bloque " + (guardado ? "guardado" : "borrador");
  el.dataset.uid = b.uid;
  el.style.left = b.x + "px";
  el.style.top = b.y + "px";
  if (guardado) {
    // medida EXACTA del documento (el alto ya fue medido al guardar)
    if (b.w) el.style.width = b.w + "px";
    if (b.h) el.style.minHeight = b.h + "px";
  } else {
    // borrador: ancho cómodo para el formulario (o el que se ajustó)
    el.style.width = (b.w ? Math.min(b.w, Math.max(200, seccion.w)) + "px" : "360px");
  }

  /* ---- cabecera SIEMPRE en el flujo: nombre · medida · acciones ---- */
  const cab = document.createElement("div");
  cab.className = "cr-bcab";

  const nombre = document.createElement("span");
  nombre.className = "cr-bnombre";
  nombre.innerHTML = '<sl-icon name="grid-3x3"></sl-icon>' + esc(r.nombre);
  cab.appendChild(nombre);

  const medida = document.createElement("span");
  medida.className = "cr-bmedida";
  medida.textContent = textoMedida(b);
  cab.appendChild(medida);

  const acciones = document.createElement("span");
  acciones.className = "cr-bacciones";

  if (guardado) {
    const editar = document.createElement("button");
    editar.className = "cr-bbtn si";
    editar.title = "Editar este bloque";
    editar.innerHTML = '<sl-icon name="pencil"></sl-icon> Editar';
    editar.addEventListener("click", (e) => {
      e.stopPropagation();
      b.guardado = false;
      b.medidaOk = false;
      guardarBorrador();
      dibujarPagina();
    });
    acciones.appendChild(editar);
  }

  const eliminar = document.createElement("button");
  eliminar.className = "cr-bbtn no";
  eliminar.title = "Eliminar este bloque";
  eliminar.innerHTML = '<sl-icon name="trash"></sl-icon>';
  eliminar.addEventListener("click", (e) => {
    e.stopPropagation();
    seccion.bloques = seccion.bloques.filter((x) => x.uid !== b.uid);
    contenidoTarjetas.delete(b.uid);
    guardarBorrador();
    dibujarPagina();
    renderizarPreview();
  });
  acciones.appendChild(eliminar);

  cab.appendChild(acciones);
  el.appendChild(cab);

  /* ---- cuerpo: formulario (borrador) o contenido real (guardado) ---- */
  const cuerpo = document.createElement("div");
  cuerpo.className = "cr-bcuerpo";
  if (guardado) {
    const entrada = contenidoTarjetas.get(b.uid);
    if (entrada && entrada.nodo) {
      cuerpo.appendChild(entrada.nodo);   // contenido REAL montado
    } else {
      const espera = document.createElement("div");
      espera.className = "cr-bespera";
      espera.innerHTML = '<sl-icon name="arrow-repeat"></sl-icon> Midiendo el tamaño real…';
      cuerpo.appendChild(espera);
    }
  } else {
    cuerpo.appendChild(formularioEl(b, r, medida));
  }
  el.appendChild(cuerpo);

  if (!guardado) {
    /* ---- manija de redimensionar (solo borrador) ---- */
    const manija = document.createElement("div");
    manija.className = "cr-resize";
    manija.title = "Arrastra para cambiar el ancho/alto de trabajo";
    activarRedimension(manija, el, b, medida);
    el.appendChild(manija);

    activarArrastre(cab, el, b, medida, seccion);
  }

  return el;
}

/* ============================================================
   v6 — BARRA DE FORMATO + VISTA PREVIA «Así se ve»
   ------------------------------------------------------------
   Los campos de texto que admiten marcas (**negrita**, $fórmulas$…)
   llevan botones que envuelven el texto seleccionado y una vista
   previa con el MISMO motor que usa el documento:
     · formato: true → TODAS las marcas (formatoTexto.js)
     · formato: "f"  → solo $fórmulas$ (formatearFormulas.js, la
       MISMA función textoConFormulas que usan las utils)
   Así el docente VE el resultado antes de guardar y descubre qué
   admite cada campo sin adivinar.
   ============================================================ */

const MARCAS_FORMATO = [
  { abrir: "**", cerrar: "**", et: "N", title: "Negrita — **texto**" },
  { abrir: "*", cerrar: "*", et: "I", title: "Cursiva — *texto*" },
  { abrir: "__", cerrar: "__", et: "U", title: "Subrayado — __texto__" },
  { abrir: "~~", cerrar: "~~", et: "S", title: "Tachado — ~~texto~~" },
  { abrir: "$", cerrar: "$", et: "ƒ", title: "Fórmula matemática — $x^2$" },
  { abrir: "^", cerrar: "^", et: "x²", title: "Superíndice — ^2^" },
  { abrir: "~", cerrar: "~", et: "x₂", title: "Subíndice — ~2~ (H~2~O)" },
  { abrir: "==", cerrar: "==", et: "marc", title: "Resaltado amarillo — ==texto==" },
  { abrir: "{{", cerrar: "|rojo}}", et: "A", title: "Color — {{texto|rojo}} (rojo, azul, verde, naranja, morado, gris)" },
  { abrir: "`", cerrar: "`", et: "code", title: "Código — `texto`" },
];

function envolverSeleccion(campo, abrir, cerrar) {
  const ini = campo.selectionStart ?? campo.value.length;
  const fin = campo.selectionEnd ?? ini;
  const sel = campo.value.slice(ini, fin) || "texto";
  campo.value = campo.value.slice(0, ini) + abrir + sel + cerrar + campo.value.slice(fin);
  campo.focus();
  const a = ini + abrir.length;
  try { campo.setSelectionRange(a, a + sel.length); } catch (e) { /* campos sin selección */ }
  campo.dispatchEvent(new Event("input", { bubbles: true }));
}

function barraFormato(campo, nivel) {
  const barra = document.createElement("div");
  barra.className = "cr-fmtbar";
  MARCAS_FORMATO.forEach((m) => {
    if (nivel === "f" && m.abrir !== "$") return;   // solo la fórmula
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cr-fmt-btn";
    b.title = m.title;
    b.innerHTML =
      m.abrir === "**" ? "<b>N</b>" :
      m.abrir === "*" ? "<i>I</i>" :
      m.abrir === "__" ? "<u>U</u>" :
      m.abrir === "~~" ? "<s>S</s>" :
      esc(m.et);
    b.addEventListener("mousedown", (e) => e.preventDefault());   // conserva la selección
    b.addEventListener("click", () => envolverSeleccion(campo, m.abrir, m.cerrar));
    barra.appendChild(b);
  });
  return barra;
}

let katexVistaPromesa = null;

// KaTeX para las vistas previas (mejor esfuerzo: sin red queda LaTeX plano legible)
function asegurarKatexVista() {
  if (!katexVistaPromesa) {
    katexVistaPromesa = moduloDe({ id: "__vistaFormulas__", archivo: "utils/formatearFormulas.js" })
      .then((mod) => (mod && typeof mod.cargarFormulas === "function" ? mod.cargarFormulas() : false))
      .catch(() => false);
  }
  return katexVistaPromesa;
}

function previstaFormato(campo, nivel) {
  const caja = document.createElement("div");
  caja.className = "cr-fmt-prev";
  caja.innerHTML = '<span class="cr-fmt-prev-et">Así se ve</span><span class="cr-fmt-prev-txt"></span>';
  const vista = caja.querySelector(".cr-fmt-prev-txt");

  let reloj = null;
  let pasada = 0;

  const pintar = async () => {
    const miPasada = ++pasada;
    const texto = String(campo.value ?? "");
    if (!texto.trim()) { vista.textContent = ""; return; }
    try {
      if (nivel === "f") {
        const mod = await moduloDe({ id: "__vistaFormulas__", archivo: "utils/formatearFormulas.js" });
        if (miPasada !== pasada || !document.contains(caja)) return;
        vista.innerHTML = mod && typeof mod.textoConFormulas === "function" ? mod.textoConFormulas(texto) : esc(texto);
        if (/\$\$|\$|\\\(/.test(texto)) {
          asegurarKatexVista().then(() => {
            if (miPasada === pasada && document.contains(caja) && mod.textoConFormulas) {
              vista.innerHTML = mod.textoConFormulas(texto);
            }
          });
        }
      } else {
        const mod = await moduloDe({ id: "__vistaFormato__", archivo: "componentes/formatoTexto.js" });
        if (miPasada !== pasada || !document.contains(caja)) return;
        if (mod && typeof mod.formatoTexto === "function") {
          vista.innerHTML = mod.formatoTexto(texto);
          if (/\$\$|\$|\\\(/.test(texto)) {
            asegurarKatexVista().then((ok) => {
              if (ok && miPasada === pasada && document.contains(caja)) {
                vista.innerHTML = mod.formatoTexto(texto);
              }
            });
          }
        } else {
          vista.textContent = texto;
        }
      }
    } catch (e) {
      vista.textContent = texto;
    }
  };

  campo.addEventListener("input", () => {
    clearTimeout(reloj);
    reloj = setTimeout(pintar, 250);
  });
  return caja;
}

/* ============================================================
   v6 — REPETIDOR: «¿Cuántas?» + N filas idénticas numeradas
   ------------------------------------------------------------
   Cada fila se guarda con el MISMO formato de líneas que el JS del
   bloque ya leía (una fila = una línea; columnas de la misma línea
   unidas con « | »), así que la vista previa, los borradores viejos
   y el código generado NO cambian. Solo mejora CÓMO se piden los
   datos: se escribe la cantidad y aparecen ESAS filas, numeradas.
   ============================================================ */

function repClaveCuantas(p) {
  return "_" + p.k + "_n";
}

// Lee las filas del repetidor desde b.valores (entiende borradores
// viejos escritos a mano: son las mismas líneas de siempre).
function repFilas(b, p) {
  const extras = {};
  (p.columnas || []).forEach((c) => {
    if (!c.resto && c.clave !== p.k) extras[c.clave] = lineas(b.valores[c.clave]);
  });
  const etiquetas = p.etiqueta ? lineas(b.valores[p.etiqueta.clave]) : [];
  const filas = [];

  // modo JSON (lista con párrafo/sublista)
  if (p.serializa === "json") {
    const j = jsonSeguro(b.valores[p.k]);
    if (j.ok && Array.isArray(j.valor)) {
      j.valor.forEach((it) => {
        const o = it && typeof it === "object" ? it : { texto: it };
        filas.push({
          celdas: (p.columnas || []).map((c) => {
            const prop = o[c.json || "texto"];
            if (Array.isArray(prop)) return prop.join(" | ");
            return String(prop ?? "");
          }),
          etiqueta: "",
          marca: false,
        });
      });
      return filas;
    }
  }

  lineas(b.valores[p.k]).forEach((linea, i) => {
    // si esta clave tiene columnas «resto», la 1.ª columna es solo la
    // parte ANTES del «|» (la de después es la celda resto)
    const tieneResto = (p.columnas || []).some((x) => x.resto && x.clave === p.k);
    const base = (() => {
      if (!tieneResto) return linea;
      const corte = linea.indexOf("|");
      return corte >= 0 ? linea.slice(0, corte).trim() : linea.trim();
    })();
    filas.push({
      celdas: (p.columnas || []).map((c) => {
        if (c.resto) {
          const corte = linea.indexOf("|");
          return corte >= 0 ? linea.slice(corte + 1).trim() : "";
        }
        if (c.clave === p.k) return base;
        return String(extras[c.clave]?.[i] ?? "");
      }),
      etiqueta: String(etiquetas[i] ?? ""),
      marca: false,
    });
  });

  // marca(s) correcta(s) guardadas (borradores viejos incluidos)
  if (p.marca) {
    if (p.marca.tipo === "radio") {
      const i = (num(b.valores[p.marca.clave]) ?? 0) - 1;
      if (i >= 0 && i < filas.length) filas[i].marca = true;
    } else {
      String(b.valores[p.marca.clave] ?? "")
        .split(/[,\s]+/)
        .map((t) => Number(t))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= filas.length)
        .forEach((n) => { filas[n - 1].marca = true; });
    }
  }

  // v6: conservar las filas VACÍAS que el docente pidió (el contador
  // «¿Cuántas?» quedó guardado) — si el formulario se repinta en
  // mientras escribe, no se le colapsan las filas que aún no llenó.
  const maximo = Number.isFinite(p.cuantas && p.cuantas.max) ? p.cuantas.max : 20;
  const pedidas = Math.min(maximo, num(b.valores[repClaveCuantas(p)]) ?? 0);
  while (filas.length < pedidas) {
    filas.push({ celdas: (p.columnas || []).map(() => ""), etiqueta: "", marca: false });
  }
  return filas;
}

// Escribe las filas en b.valores con el formato de SIEMPRE.
function repSerializar(b, p, filas) {
  const grupos = new Map();
  (p.columnas || []).forEach((c, idx) => {
    if (!grupos.has(c.clave)) grupos.set(c.clave, []);
    grupos.get(c.clave).push({ ...c, idx });
  });

  if (p.serializa === "json") {
    const conExtras = filas.some((f) =>
      (p.columnas || []).some((c, idx) => idx > 0 && String(f.celdas[idx] ?? "").trim())
    );
    if (conExtras) {
      const arr = filas.map((f) => {
        const o = {};
        (p.columnas || []).forEach((c, idx) => {
          const v = String(f.celdas[idx] ?? "").trim();
          if (v && c.json) {
            o[c.json] = c.json === "sublista"
              ? v.split("|").map((s) => s.trim()).filter(Boolean)
              : v;
          }
        });
        return o;
      });
      b.valores[p.k] = JSON.stringify(arr);
    } else {
      b.valores[p.k] = filas.map((f) => String(f.celdas[0] ?? "").trim()).join("\n");
    }
  } else {
    grupos.forEach((cols, clave) => {
      if (cols.length > 1 || cols[0].resto) {
        // columnas de la MISMA línea (se unen con « | »)
        b.valores[clave] = filas
          .map((f) => cols.map((c) => String(f.celdas[c.idx] ?? "").trim()).filter(Boolean).join(" | "))
          .join("\n");
      } else {
        const c = cols[0];
        b.valores[clave] = filas.map((f) => String(f.celdas[c.idx] ?? "").trim()).join("\n");
      }
    });
  }

  if (p.etiqueta) {
    b.valores[p.etiqueta.clave] = filas.map((f) => String(f.etiqueta ?? "").trim()).join("\n");
  }
  if (p.marca) {
    if (p.marca.tipo === "radio") {
      const i = filas.findIndex((f) => f.marca);
      b.valores[p.marca.clave] = i >= 0 ? String(i + 1) : "";
    } else {
      b.valores[p.marca.clave] = filas
        .map((f, i) => (f.marca ? i + 1 : null))
        .filter(Boolean)
        .join(", ");
    }
  }
  b.valores[repClaveCuantas(p)] = String(filas.length);
}

// ¿La fila está completa según sus columnas obligatorias?
function repFilaIncompleta(p, fila) {
  return (p.columnas || []).some((c, idx) => c.req && !String(fila.celdas[idx] ?? "").trim()) ||
    !!(p.etiqueta && p.etiqueta.req && !String(fila.etiqueta ?? "").trim());
}

function campoRepetidor(b, p) {
  const env = document.createElement("div");
  env.className = "cr-rep";
  env.dataset.rep = p.k;
  env.dataset.k = p.k;

  const filas = repFilas(b, p);
  const cuantas = p.cuantas || {};
  const MIN = Number.isFinite(cuantas.min) ? cuantas.min : 1;
  const MAX = Number.isFinite(cuantas.max) ? cuantas.max : 20;
  // v6: un bloque NUEVO arranca con las filas por defecto (p. ej. 3 respuestas)
  // listas para escribir; los bloques con datos guardados abren con sus filas.
  if (!filas.length) {
    const defN = Math.max(MIN, Math.min(MAX, Math.round(Number(cuantas.def ?? MIN) || 0)));
    for (let i = 0; i < defN; i++) {
      filas.push({ celdas: (p.columnas || []).map(() => ""), etiqueta: "", marca: false });
    }
  }

  // ---- contador «¿Cuántas?» ----
  const top = document.createElement("div");
  top.className = "cr-rep-top";
  const et = document.createElement("label");
  et.innerHTML = esc(p.et) + (p.req ? ' <span class="req" title="Obligatorio">●</span>' : "");
  top.appendChild(et);

  const zona = document.createElement("span");
  zona.className = "cr-rep-cuantas";
  zona.innerHTML = esc(cuantas.et || "¿Cuántas?") + " ";
  const btnMenos = document.createElement("button");
  btnMenos.type = "button";
  btnMenos.textContent = "−";
  btnMenos.title = "Una fila menos";
  const inN = document.createElement("input");
  inN.type = "number";
  inN.min = String(MIN);
  inN.max = String(MAX);
  inN.value = String(Math.max(filas.length, MIN));
  const btnMas = document.createElement("button");
  btnMas.type = "button";
  btnMas.textContent = "+";
  btnMas.title = "Una fila más";
  zona.append(btnMenos, inN, btnMas);
  top.appendChild(zona);
  env.appendChild(top);

  const ayuda = document.createElement("p");
  ayuda.className = "cr-rep-ayuda";
  ayuda.textContent = p.ayuda || "Cada fila es un dato del bloque; se numeran solas.";
  env.appendChild(ayuda);

  const cont = document.createElement("div");
  cont.className = "cr-rep-filas";
  env.appendChild(cont);

  const sincronizar = () => {
    repSerializar(b, p, filas);
    guardarBorrador();
  };

  const pintarFilas = () => {
    inN.value = String(filas.length);
    cont.innerHTML = "";
    filas.forEach((fila, i) => {
      const filaEl = document.createElement("div");
      filaEl.className = "cr-rep-fila";
      filaEl.dataset.repIdx = String(i);

      const numEl = document.createElement("span");
      numEl.className = "cr-rep-num";
      numEl.textContent = String(i + 1);
      filaEl.appendChild(numEl);

      const celdas = document.createElement("div");
      celdas.className = "cr-rep-celdas";
      (p.columnas || []).forEach((c, idx) => {
        const envC = document.createElement("div");
        const etC = document.createElement("label");
        etC.innerHTML = esc(c.et) + (c.req ? ' <span class="req">●</span>' : "");
        envC.appendChild(etC);
        const inC = document.createElement("input");
        inC.type = "text";
        inC.value = valorCampo(fila.celdas[idx] ?? "");
        inC.placeholder = c.ej || "";
        inC.addEventListener("input", () => {
          fila.celdas[idx] = inC.value;
          filaEl.classList.remove("error");
          env.classList.remove("cr-rep-error");
          sincronizar();
        });
        envC.appendChild(inC);
        if (c.formato) envC.appendChild(barraFormato(inC, c.formato));   // mini barra, sin vista previa
        celdas.appendChild(envC);
      });

      if (p.etiqueta) {
        const envE = document.createElement("div");
        const etE = document.createElement("label");
        etE.textContent = p.etiqueta.et || "Etiqueta";
        envE.appendChild(etE);
        const inE = document.createElement("input");
        inE.type = "text";
        inE.value = valorCampo(fila.etiqueta ?? "");
        inE.placeholder = p.etiqueta.ej || "";
        inE.addEventListener("input", () => {
          fila.etiqueta = inE.value;
          sincronizar();
        });
        envE.appendChild(inE);
        celdas.appendChild(envE);
      }

      filaEl.appendChild(celdas);

      if (p.marca) {
        const lb = document.createElement("label");
        lb.className = "cr-rep-marca " + (p.marca.tipo === "radio" ? "radio" : "checks");
        const inM = document.createElement("input");
        inM.type = p.marca.tipo === "radio" ? "radio" : "checkbox";
        inM.name = "rep-" + p.k + "-" + b.uid;
        inM.checked = !!fila.marca;
        inM.addEventListener("change", () => {
          if (p.marca.tipo === "radio") filas.forEach((f) => { f.marca = false; });
          fila.marca = inM.checked;
          filas.forEach((f, j) => {
            const chk = cont.querySelector('.cr-rep-fila[data-rep-idx="' + j + '"] .cr-rep-marca input');
            if (chk) chk.checked = !!f.marca;
          });
          env.classList.remove("cr-rep-error");
          sincronizar();
        });
        lb.appendChild(inM);
        lb.appendChild(document.createTextNode(p.marca.et || "Correcta"));
        filaEl.appendChild(lb);
      }

      cont.appendChild(filaEl);
    });
  };

  const ponerN = (n) => {
    const nuevo = Math.min(MAX, Math.max(MIN, Math.round(Number(n) || 0)));
    if (nuevo === filas.length) return;   // v6: sin cambio → NO reconstruir (evita soltar nodos bajo el cursor)
    while (filas.length < nuevo) {
      filas.push({
        celdas: (p.columnas || []).map(() => ""),
        etiqueta: "",
        marca: false,
      });
    }
    if (filas.length > nuevo) filas.length = nuevo;
    pintarFilas();
    sincronizar();
  };

  btnMas.addEventListener("click", () => ponerN(filas.length + 1));
  btnMenos.addEventListener("click", () => ponerN(filas.length - 1));
  inN.addEventListener("change", () => ponerN(inN.value));

  pintarFilas();
  return env;
}

/* ---------------- formulario de un bloque ---------------- */

// Catálogo de figuras de svg.js (import perezoso: si svg.js no carga,
// el editor entero sigue funcionando)
let cacheFiguras = null;
async function opcionesFigura() {
  if (cacheFiguras) return cacheFiguras;
  try {
    const mod = await moduloDe({ id: "__figurasSvg__", archivo: "componentes/svg.js" });
    cacheFiguras = mod.figurasDisponibles();
  } catch (e) {
    cacheFiguras = [];
  }
  return cacheFiguras;
}

function formularioEl(b, r, medida) {
  const form = document.createElement("div");
  form.className = "cr-form";

  (r.params || []).forEach((p) => {
    if (p.tipo === "repetidor") {   // v6: «¿Cuántas?» + filas idénticas numeradas
      form.appendChild(campoRepetidor(b, p));
      return;
    }
    const envoltura = document.createElement("div");

    const etiqueta = document.createElement("label");
    etiqueta.innerHTML =
      esc(p.et) +
      (p.req
        ? ' <span class="req" title="Obligatorio">●</span>'
        : ' <span class="op">(opcional)</span>');
    envoltura.appendChild(etiqueta);

    let campo;
    const valor = b.valores[p.k] ?? "";

    if (p.tipo === "sino") {
      campo = document.createElement("div");
      campo.className = "fch";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.dataset.k = p.k;
      chk.checked = bool(valor, !!p.def);
      chk.addEventListener("change", () => {
        b.valores[p.k] = chk.checked ? "true" : "false";
        guardarBorrador();
      });
      campo.appendChild(chk);
      const nota = document.createElement("span");
      nota.style.cssText = "font-size:.72rem;color:#9ca3af;";
      nota.textContent = chk.checked ? "sí" : "no";
      chk.addEventListener("change", () => { nota.textContent = chk.checked ? "sí" : "no"; });
      envoltura.appendChild(campo);
      form.appendChild(envoltura);
      return;
    }

    if (p.tipo === "opcion") {
      campo = document.createElement("select");
      campo.innerHTML =
        '<option value="">— elige —</option>' +
        (p.ops && p.ops.length ? p.ops : [])
          .map((o) => '<option value="' + esc(o) + '">' + esc(o) + "</option>")
          .join("");
      campo.value = String(valor ?? "");
      // catálogo dinámico para la figura de svg.js
      if (p.k === "figura" && !(p.ops && p.ops.length)) {
        opcionesFigura().then((ops) => {
          const actual = campo.value;
          campo.innerHTML =
            '<option value="">— elige —</option>' +
            ops.map((o) => '<option value="' + esc(o) + '">' + esc(o) + "</option>").join("");
          campo.value = actual;
        });
      }
    } else if (p.tipo === "area" || p.tipo === "lineas" || p.tipo === "json") {
      campo = document.createElement("textarea");
      campo.value = valorCampo(valor);
      campo.placeholder = p.ej || "";
      if (p.tipo === "lineas") campo.rows = 3;
      if (p.tipo === "json") campo.rows = 4;
      if (p.tipo === "area" && p.req) campo.rows = 3;
    } else if (p.tipo === "num") {
      campo = document.createElement("input");
      campo.type = "number";
      campo.step = "any";
      campo.value = valorCampo(valor);
      campo.placeholder = p.ej || "";
    } else {
      campo = document.createElement("input");
      campo.type = "text";
      campo.value = valorCampo(valor);
      campo.placeholder = p.ej || "";
    }

    const conFormato = (p.tipo === "texto" || p.tipo === "area") && p.formato;   // v6: barra + «Así se ve»
    if (conFormato) envoltura.appendChild(barraFormato(campo, p.formato));

    campo.dataset.k = p.k;
    campo.addEventListener("input", () => {
      b.valores[p.k] = campo.value;
      campo.classList.remove("error");
      guardarBorrador();
    });

    envoltura.appendChild(campo);
    if (conFormato) envoltura.appendChild(previstaFormato(campo, p.formato));
    form.appendChild(envoltura);
  });

  const nota = document.createElement("p");
  nota.style.cssText = "margin:.1rem 0 0;font-size:.7rem;color:#9ca3af;";
  nota.innerHTML = '● obligatorio · (opcional) — al guardar, el bloque toma su <b>medida real</b> en el documento.';
  form.appendChild(nota);

  const guardar = document.createElement("button");
  guardar.className = "cr-bguardar";
  guardar.innerHTML = '<sl-icon name="lock"></sl-icon> Guardar (bloquear) y medir';
  guardar.addEventListener("click", () => guardarBloque(b, form));
  form.appendChild(guardar);

  return form;
}

async function guardarBloque(b, form) {
  const r = recursoDe(b.recurso);
  const malos = [];
  const notasRep = [];
  (r.params || []).forEach((p) => {
    if (!p.req) return;
    if (p.tipo === "repetidor") {   // v6: valida filas y la marca correcta
      const filas = repFilas(b, p);
      const incompletas = [];
      filas.forEach((f, i) => { if (repFilaIncompleta(p, f)) incompletas.push(i + 1); });
      const sinMarca = p.marca && !filas.some((f) => f.marca);
      if (!filas.length || incompletas.length || sinMarca) {
        malos.push(p.k);
        if (!filas.length) notasRep.push("«" + p.et + "»: agrega al menos una fila.");
        else if (incompletas.length) notasRep.push("«" + p.et + "»: completa la fila " + incompletas.join(", ") + ".");
        else notasRep.push("«" + p.et + "»: marca " + (p.marca.tipo === "radio" ? "la respuesta correcta" : "al menos una correcta") + ".");
      }
      return;
    }
    const v = b.valores[p.k];
    let ok = true;
    if (p.tipo === "num") ok = num(v) !== undefined;
    else if (p.tipo === "lineas") ok = lineas(v).length > 0;
    else ok = String(v ?? "").trim() !== "";
    if (!ok) malos.push(p.k);
  });

  if (malos.length) {
    if (form) {
      malos.forEach((k) => {
        const pRep = (r.params || []).find((x) => x.k === k && x.tipo === "repetidor");
        if (!pRep) {
          const c = form.querySelector('[data-k="' + k + '"]');
          if (c) c.classList.add("error");
          return;
        }
        const rep = form.querySelector('[data-rep="' + k + '"]');
        if (!rep) return;
        rep.classList.add("cr-rep-error");
        repFilas(b, pRep).forEach((f, i) => {
          if (repFilaIncompleta(pRep, f)) {
            const el = rep.querySelector('.cr-rep-fila[data-rep-idx="' + i + '"]');
            if (el) el.classList.add("error");
          }
        });
      });
    }
    notify(notasRep.length ? notasRep.join(" ") : "Faltan campos obligatorios (●) en «" + r.nombre + "».", "warning");
    return;
  }

  b.guardado = true;
  b.medidaOk = false;
  guardarBorrador();
  dibujarPagina();

  // 1) montar de verdad en la vista previa y MEDIR
  await renderizarPreview();
  // 2) montar el contenido real en la tarjeta y repintar con su medida
  sincronizarTarjetas();
  dibujarPagina();

  if (b.w && b.h) {
    notify("«" + r.nombre + "» guardado: mide " + b.w + " × " + b.h + " px en el documento.", "success");
  } else {
    notify("«" + r.nombre + "» guardado.", "success");
  }
}

/* ---------------- mover y redimensionar ----------------

   MOVER: la cabecera arrastra el bloque. Mientras se arrastra se
   resalta el espacio bajo el puntero; al soltar:
     · sobre OTRA sección  → el bloque CAMBIA de dueño (se mete en
       esa sección, sin JSON: puramente por área);
     · sobre SU sección    → queda ajustado a la cuadrícula;
     · fuera de toda sección → VUELVE a donde estaba.            */

function activarArrastre(cab, el, b, medida, seccion) {
  cab.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    // Guardado = contenido y posición BLOQUEADOS (hay que Editar)
    if (b.guardado) return;
    const objetivo = e.target.closest("button, input, select, textarea, a");
    if (objetivo) return; // no arrastrar desde los controles

    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const rectL = el.parentElement.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    const x0 = b.x, y0 = b.y;   // para volver si sueltan fuera de todo

    // rects de TODOS los espacios (para saber el destino al soltar)
    const destinos = (refUI ? [...refUI.pagina.querySelectorAll(".cr-sec-lienzo")] : [])
      .map((n) => ({ n, s: seccionDe(n.dataset.sec), r: n.getBoundingClientRect() }))
      .filter((d) => d.s);

    cab.setPointerCapture(e.pointerId);
    el.classList.add("moviendo");

    const destinoDe = (ev) => destinos.find((d) =>
      ev.clientX >= d.r.left && ev.clientX <= d.r.right &&
      ev.clientY >= d.r.top && ev.clientY <= d.r.bottom) || null;

    const mover = (ev) => {
      // SIN límites duros: puede salir de su espacio para pasar a otro
      const nx = Math.round(ev.clientX - rectL.left - dx);
      const ny = Math.max(0, Math.round(ev.clientY - rectL.top - dy));
      b.x = nx; b.y = ny;
      el.style.left = nx + "px";
      el.style.top = ny + "px";
      medida.textContent = textoMedida(b);

      const d = destinoDe(ev);
      destinos.forEach((x) => x.n.classList.toggle("destino", !!d && x.n === d.n));
    };

    const soltar = (ev) => {
      cab.removeEventListener("pointermove", mover);
      el.classList.remove("moviendo");
      destinos.forEach((x) => x.n.classList.remove("destino"));

      const d = destinoDe(ev);
      if (d && d.s.uid !== seccion.uid) {
        // CAMBIO DE DUEÑO: el bloque pasa al espacio de la otra sección
        seccion.bloques = seccion.bloques.filter((x) => x.uid !== b.uid);
        b.x = snap(Math.max(0, ev.clientX - d.r.left - dx));
        b.y = snap(Math.max(0, ev.clientY - d.r.top - dy));
        d.s.bloques.push(b);
        seccionActiva = d.s.uid;
      } else if (d && d.s.uid === seccion.uid) {
        // misma sección: a la cuadrícula y dentro del espacio
        b.x = snap(ev.clientX - rectL.left - dx);
        b.y = snap(Math.max(0, ev.clientY - rectL.top - dy));
        const anchoDisponible = Math.max(0, rectL.width - el.offsetWidth);
        if (b.x > anchoDisponible) b.x = Math.max(0, snap(anchoDisponible));
      } else {
        // fuera de toda sección: el bloque VUELVE a donde estaba
        b.x = x0; b.y = y0;
      }

      guardarBorrador();
      dibujarPagina();
    };

    cab.addEventListener("pointermove", mover);
    cab.addEventListener("pointerup", soltar, { once: true });
    cab.addEventListener("pointercancel", soltar, { once: true });
  });
}

function activarRedimension(manija, el, b, medida) {
  manija.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const x0 = e.clientX, y0 = e.clientY;
    const w0 = rect.width, h0 = el.offsetHeight;
    manija.setPointerCapture(e.pointerId);
    el.classList.add("redim");

    const mover = (ev) => {
      b.w = Math.max(140, snap(w0 + (ev.clientX - x0)));
      b.h = Math.max(40, snap(h0 + (ev.clientY - y0)));
      el.style.width = b.w + "px";
      el.style.minHeight = b.h + "px";
      medida.textContent = textoMedida(b);
    };
    const soltar = () => {
      manija.removeEventListener("pointermove", mover);
      el.classList.remove("redim");
      guardarBorrador();
    };
    manija.addEventListener("pointermove", mover);
    manija.addEventListener("pointerup", soltar, { once: true });
    manija.addEventListener("pointercancel", soltar, { once: true });
  });
}

// Tamaño del ESPACIO EN BLANCO de una sección (arrastrar la esquina).
function activarRedimensionSeccion(manija, s, tarjeta, lienzo, medidaEl, indice) {
  manija.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX, y0 = e.clientY;
    const w0 = s.w, h0 = s.h;
    manija.setPointerCapture(e.pointerId);

    const mover = (ev) => {
      s.w = Math.min(ANCHO_LIENZO, Math.max(200, w0 + Math.round((ev.clientX - x0))));
      s.h = Math.max(80, h0 + Math.round(ev.clientY - y0));
      tarjeta.style.width = (s.w + 4) + "px";
      lienzo.style.minHeight = altoLienzo(s) + "px";
      medidaEl.textContent = textoMedidaSeccion(s, indice);
    };
    const soltar = () => {
      manija.removeEventListener("pointermove", mover);
      guardarBorrador();
      if (s.guardado) renderizarPreview();
    };
    manija.addEventListener("pointermove", mover);
    manija.addEventListener("pointerup", soltar, { once: true });
    manija.addEventListener("pointercancel", soltar, { once: true });
  });
}

/* ============================================================
   DERECHA — VISTA PREVIA (render REAL con crearSecciones)
   + MEDICIÓN: al terminar, cada bloque y cada sección adoptan el
   ancho y el alto EXACTOS que tendrán en el documento.
   Regla v4: 1 sección = documento corrido · 2 o más = Siguiente.
   (crearSecciones — section.js v4 — aplica la misma regla.)
   ============================================================ */

function claseDemo() {
  return {
    id: estado.id || "vista-previa",
    grado: 8,
    materiaId: "matematica-y-datos",
    dia: 1,
    unidad: 1,
    leccion: 1,
  };
}

let generacionPreview = 0;   // descarta pasadas viejas si algo cambió en medio

// Llama a la fábrica SIN esperar su promesa: las utils devuelven
// Promise<number> que SOLO resuelve cuando el estudiante responde —
// el DOM queda montado igual y la promesa se gestiona aparte.
function lanzarMontaje(r, fn, opc, destino, esFondo, valores) {
  if (r.funcion === "renderTTS") {
    // firma posicional propia: renderTTS(contenedor, idioma, texto, opciones)
    return fn(destino, opc.idioma || "es", opc.texto || "", { titulo: opc.titulo });
  }
  if (r.montaLista) {
    // fábricas sin `contenedor`: devuelven { elemento } o una lista
    const devuelto = fn(opc);
    const pieza = devuelto && devuelto.elemento instanceof Element ? devuelto.elemento : devuelto;
    if (Array.isArray(pieza)) pieza.forEach((x) => destino.appendChild(x));
    else if (pieza instanceof Element) destino.appendChild(pieza);
    return devuelto;
  }
  if (esFondo) {
    opc.posicion = { arriba: valores._y ?? 0, izquierda: valores._x ?? 0 };
    return fn({ ...opc, contenedor: destino });
  }
  const devuelto = fn({ ...opc, contenedor: destino });
  if (Array.isArray(devuelto)) {
    devuelto.forEach((x) => destino.appendChild(x));
  } else {
    Promise.resolve(devuelto).catch((e) => console.warn("[crear] montaje:", e));
  }
  return devuelto;
}

// Monta un recurso en un destino aislado (vista previa o tarjeta):
// espera SOLO la carga del módulo (los fallos de carga son los que
// muestran la tarjeta de error). OJO: el resultado de la fábrica va
// ENVUELTO en { valor } para que la función async NUNCA «adopte» la
// promesa de las utils (Promise<number> que solo resuelve cuando el
// estudiante responde; esperarla congelaría el editor).
async function montarRecurso(r, valores, destino, esFondo) {
  const ctx = { tipo: estado.tipo, perfil: PERFIL_DEMO, clase: claseDemo(), id: estado.id };
  const mod = await moduloDe(r);
  const fn = mod[r.funcion];
  if (typeof fn !== "function") throw new Error("el módulo no exporta " + r.funcion);
  const opc = r.aOpciones ? r.aOpciones(valores, ctx) : {};
  return { valor: lanzarMontaje(r, fn, opc, destino, esFondo, valores) };
}

// Tarjeta de error con diagnóstico (¿qué pasa en realidad?) y Reintentar
function pintarError(destino, r, error, alReintentar) {
  const caja = document.createElement("div");
  caja.className = "cr-error-caja";
  const msg = document.createElement("span");
  msg.textContent = "⚠ Cargando «" + r.nombre + "»…";
  caja.appendChild(msg);
  destino.appendChild(caja);

  mensajeDeError(r, error).then((texto) => {
    if (!caja.isConnected) return;
    msg.textContent = "⚠ " + texto;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = '<sl-icon name="arrow-repeat"></sl-icon> Reintentar';
    btn.addEventListener("click", alReintentar);
    caja.appendChild(btn);
  });
}

function reintentarRecurso(r) {
  MODULOS.delete(r.id);
  renderizarPreview().then(() => {
    sincronizarTarjetas();
    dibujarPagina();
  });
}

// ¿Hay un formulario de BORRADOR en edición? (v6: los repintados de
// fondo NO roban el foco mientras el docente escribe)
function editandoBorrador() {
  const a = document.activeElement;
  if (!a) return false;
  const tag = (a.tagName || "").toLowerCase();
  if (tag !== "input" && tag !== "textarea" && tag !== "select") return false;
  const bloque = a.closest(".cr-bloque");
  return !!(bloque && bloque.classList.contains("borrador"));
}

async function renderizarPreview() {
  if (!refUI || !document.contains(refUI.cvLienzo)) return;
  const miGen = ++generacionPreview;
  const lienzo = refUI.cvLienzo;
  lienzo.innerHTML = "";

  // Secciones que ya viven en el documento: guardadas o con bloques
  // guardados dentro (las que solo están en borrador aún no cuentan).
  const enDoc = estado.secciones.filter(
    (s) => s.guardado || s.bloques.some((b) => b.guardado)
  );

  if (!enDoc.length) {
    const vacio = document.createElement("p");
    vacio.className = "cv-vacio";
    vacio.innerHTML =
      "Aquí verás EXACTAMENTE cómo se ve la " + esc(estado.tipo) +
      " al abrirla.<br/>Agrega una sección (espacio en blanco), guarda bloques dentro y " +
      "aparece el render real: corrido con 1 sección, con <b>Siguiente</b> a partir de 2.";
    lienzo.appendChild(vacio);
    ajustarZoom();
    return;
  }

  const medidas = [];   // { s, laminaDiv } para medir secciones
  const montados = [];  // { b, s, caja, devuelto, esFondo }
  const fragmento = document.createDocumentFragment();

  for (const s of enDoc) {
    const guardados = s.bloques.filter((b) => b.guardado);
    const laminaDiv = document.createElement("div");
    laminaDiv.className = "cv-lamina";

    // el ESPACIO mide s.w: en la vista previa también
    if (s.w && s.w < ANCHO_LIENZO) laminaDiv.style.width = s.w + "px";

    // alto provisional: el del espacio, o el de sus bloques
    const provisional = guardados.reduce((m, b) => Math.max(m, b.y + (b.h || 160)), 120);
    laminaDiv.style.minHeight = Math.max(provisional, s.h || 0, 120) + "px";

    for (const b of guardados) {
      const r = recursoDe(b.recurso);
      if (!r) continue;
      const esFondo = r.id === "svg" && bool(b.valores.debajo);
      const caja = document.createElement("div");
      caja.className = "cv-bloque" + (esFondo ? " fondo" : "");
      caja.style.left = b.x + "px";
      caja.style.top = b.y + "px";
      caja.style.width = (b.w || s.w || ANCHO_LIENZO) + "px";
      laminaDiv.appendChild(caja);

      try {
        const { valor: devuelto } = await montarRecurso(r, { ...b.valores, _x: b.x, _y: b.y }, caja, esFondo);
        montados.push({ b, s, caja, devuelto, esFondo });
      } catch (e) {
        console.warn("[crear] preview:", e);
        pintarError(caja, r, e, () => reintentarRecurso(r));
        // NO entra a la medición: el tamaño del error no es el del bloque
      }
    }

    fragmento.appendChild(laminaDiv);
    medidas.push({ s, laminaDiv });
  }

  lienzo.appendChild(fragmento);
  if (miGen !== generacionPreview) return;

  // ---- Medir bloques con el layout ya establecido ----
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  if (miGen !== generacionPreview) return;
  aplicarMedidas(montados, medidas, false);

  // Las utils y KaTeX terminan de montarse más tarde (leen la nota,
  // cargan el CDN…): se reintenta hasta que todo tenga tamaño.
  (async () => {
    let cambio = false;
    for (let i = 0; i < 14; i++) {          // ~5 s de gracia
      await new Promise((r) => setTimeout(r, 350));
      if (miGen !== generacionPreview || !refUI || !document.contains(refUI.cvLienzo)) return;
      if (aplicarMedidas(montados, medidas, true)) cambio = true;
      const pendientes = montados.filter((m) =>
        !(m.caja.offsetWidth > 0 && m.caja.offsetHeight > 0)
      );
      if (!pendientes.length) break;
    }
    if (cambio && !editandoBorrador()) {
      sincronizarTarjetas();
      dibujarPagina();
    }
  })();

  // ---- Envolver TODO en crearSecciones REAL (misma regla del doc) ----
  // Con UNA lámina section.js v4 lo muestra CORRIDO (sin flechas);
  // con dos o más, una a la vez con Anterior/Siguiente y contador.
  try {
    const mod = await moduloDe({ id: "__crearSecciones__", archivo: "componentes/section.js" });
    const o = estado.opciones || {};
    const opciones = {
      contenedor: lienzo,
      secciones: medidas.map((m) => m.laminaDiv),
      avance: o.avance || "estandar",
      tarjeta: !!o.tarjeta,
      mostrarContador: o.mostrarContador !== false,
      posicionFlechas: o.posicionFlechas === "arriba" ? "arriba" : "abajo",
    };
    if (mod && typeof mod.crearSecciones === "function") {
      mod.crearSecciones(opciones);
    }
  } catch (e) {
    console.warn("[crear] crearSecciones:", e);
    // sin flechas: las láminas quedan apiladas (la medición ya está)
  }

  medirSecciones(medidas);
  ajustarZoom();
}

// Fija b.w/b.h con la medida REAL de cada bloque. Devuelve true si cambió algo.
function aplicarMedidas(montados, medidas, tardio) {
  let cambio = false;
  for (const m of montados) {
    const b = m.b;
    let w = 0, h = 0;
    if (m.caja && m.caja.isConnected) {
      w = Math.ceil(m.caja.offsetWidth || 0);
      h = Math.ceil(m.caja.offsetHeight || 0);
    }
    if (!w || !h) continue;

    if (h !== b.h) { b.h = h; cambio = true; }        // alto natural del doc.
    if (!b.w) { b.w = w; cambio = true; }             // entero → ancho real
    b.medidaOk = true;
  }
  if (cambio) medirSecciones(medidas);
  if (cambio || !tardio) guardarBorrador();
  return cambio;
}

// El alto REAL de cada lámina = su ESPACIO (s.h)… o más si el
// contenido llega más abajo (nunca se encoge lo que se pidió).
function medirSecciones(medidas) {
  for (const m of medidas) {
    const guardados = m.s.bloques.filter((b) => b.guardado);
    const alto = guardados.reduce((mx, b) => Math.max(mx, b.y + (b.h || 0)), 0);
    if (alto > 0) {
      m.s.h = Math.max(m.s.h || 0, Math.ceil(alto));
      m.s.medidaOk = true;
    }
    m.laminaDiv.style.minHeight = Math.max(m.s.h || 0, alto, 120) + "px";
  }
}

/* ---------------- tarjetas con contenido REAL ----------------
   Cada bloque guardado se ve en el centro montado de verdad, con la
   MISMA llamada que usa la vista previa. Se guarda por uid + firma
   (recurso + valores + ancho) para no volver a montar videos, iframes
   ni audio en cada repintado. */

const contenidoTarjetas = new Map();   // uid → { firma, nodo }

function firmaDe(b) {
  return JSON.stringify([b.recurso, b.valores, b.w || 0]);
}

function sincronizarTarjetas() {
  if (!estado) return;
  const vivos = new Set();

  for (const s of estado.secciones) {
    for (const b of s.bloques) {
      if (!b.guardado) continue;
      const r = recursoDe(b.recurso);
      if (!r) continue;
      vivos.add(b.uid);

      const firma = firmaDe(b);
      const entrada = contenidoTarjetas.get(b.uid);
      if (entrada && entrada.firma === firma) continue;   // sigue vigente

      const nodo = document.createElement("div");
      nodo.className = "cr-breal";
      contenidoTarjetas.set(b.uid, { firma, nodo });

      // el fondo SVG en la tarjeta se muestra como figura normal (solo
      // referencia): la vista previa de la derecha lo muestra de verdad
      const esFondo = r.id === "svg" && bool(b.valores.debajo);
      const valores = esFondo ? { ...b.valores, debajo: false } : b.valores;

      montarRecurso(r, valores, nodo, false).catch((e) => {
        console.warn("[crear] tarjeta:", e);
        if (!nodo.isConnected) return;
        nodo.innerHTML = "";
        pintarError(nodo, r, e, () => reintentarRecurso(r));
      });
    }
  }

  for (const uid of [...contenidoTarjetas.keys()]) {
    if (!vivos.has(uid)) contenidoTarjetas.delete(uid);
  }
}

function ajustarZoom() {
  if (!refUI || !document.contains(refUI.cvPagina)) return;
  const disponible = refUI.cvCuerpo.clientWidth - 32;
  const escala = Math.min(1, disponible / (ANCHO_LIENZO + 8));
  refUI.cvPagina.style.transform = escala < 0.999 ? "scale(" + escala.toFixed(4) + ")" : "none";
  refUI.zoom.textContent = Math.round(escala * 100) + "%";
  // el transform no cambia el layout: la escena mide lo que se ve.
  // OJO: soltar el alto previo de la escena antes de medir (si no,
  // el estiramiento flex realimenta la medida y la página colapsa).
  requestAnimationFrame(() => {
    if (!refUI || !document.contains(refUI.cvEscena)) return;
    const escena = refUI.cvEscena;
    escena.style.height = "auto";
    const alto = Math.round(refUI.cvPagina.offsetHeight * escala);
    escena.style.height = alto + "px";
    escena.style.overflow = "hidden";
  });
}

window.addEventListener("resize", () => { try { ajustarZoom(); } catch (e) { /* nada */ } });

/* ============================================================
   DESCARGAR CÓDIGO — genera la PÁGINA COMPLETA (.js)
   Estructura v4:
     · rutas "../../../js/…" (el archivo se guarda 3 carpetas
       más adentro: clases/{grado}/{materia}/{id}.js);
     · flecha «Volver» al inicio (clase, tarea y examen);
     · EXAMEN: no se puede salir sin pulsar «Enviar examen»;
     · documento corrido (1 sección) o Siguiente/Anterior (2+);
     · ayudas lamina() / pon() / fondo(): AGREGAR UN BLOQUE NUEVO
       es UNA línea.
   ============================================================ */

// Prefijo de rutas del archivo generado (3 niveles hasta js/)
const RAIZ_GENERADA = "../../../js/";

function rutaGenerada(archivo) {
  if (archivo.startsWith("recursos/")) return "../../../" + archivo;
  return RAIZ_GENERADA + archivo;
}

function nombreArchivo() {
  const base = (estado.id || "mi-" + estado.tipo)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "mi-" + estado.tipo) + ".js";
}

// La llamada de UN bloque guardado, como línea del archivo generado.
// varLamina es "l1", "l2"… (la lámina donde va el bloque).
function lineaDeBloque(r, b, varLamina, anchoSeccion) {
  const ctx = { tipo: estado.tipo, perfil: PERFIL_DEMO, clase: claseDemo(), id: estado.id };
  const opc = (r.aCodigo || r.aOpciones)(b.valores, ctx);
  const ancho = b.w || anchoSeccion || ANCHO_LIENZO;
  const esFondo = r.id === "svg" && bool(b.valores.debajo);

  // caja del bloque: pon(l1, x, y, ancho[, alto]) · fondo(l1, x, y)
  const caja = esFondo
    ? "fondo(" + varLamina + ", " + b.x + ", " + b.y + ")"
    : "pon(" + varLamina + ", " + b.x + ", " + b.y + ", " + ancho + (b.h ? ", " + b.h : "") + ")";

  const comentario = "  // ── " + r.nombre +
    (esFondo ? " · fondo de la lámina" : "") +
    (b.w && b.h ? " · mide " + b.w + "×" + b.h + " px" : "") + " ──";

  if (r.llamadaEspecial) {
    // firmas distintas (renderTTS…): la entrada decide la línea
    return [comentario, "  " + r.llamadaEspecial(b.valores, caja), ""];
  }

  if (r.montaLista) {
    // fábricas sin `contenedor`: devuelven { elemento }
    return [comentario, "  " + caja + ".appendChild(" + r.funcion + "(" + jsSource(opc, 2) + ").elemento);", ""];
  }

  opc.contenedor = { __raw: true, codigo: caja };
  return [comentario, "  " + r.funcion + "(" + jsSource(opc, 2) + ");", ""];
}

function generarCodigoFuente() {
  const enDoc = estado.secciones.filter((s) => s.bloques.some((b) => b.guardado));
  if (!enDoc.length) return null;

  const esExamen = estado.tipo === "examen";
  const etiquetaTipo = { clase: "CLASE", tarea: "TAREA", examen: "EXAMEN" }[estado.tipo] || "CLASE";
  const tituloPagina = estado.titulo || estado.id || "Mis Clases Online";

  /* ---- módulos que necesita la página (carga RESILIENTE) ----
     Nada de imports estáticos: si UN archivo faltaba o era copia
     vieja, la página entera moría con «Failed to fetch…». Ahora
     cada módulo se carga con cargar(): reintenta sin caché, verifica
     sus exportaciones y si algo falla AVISA con el motivo exacto
     sin tumbar la página. */
  const modulos = new Map();
  const pedir = (archivo, nombres) => {
    if (!modulos.has(archivo)) modulos.set(archivo, new Set());
    (nombres || []).forEach((n) => modulos.get(archivo).add(n));
  };
  pedir("components/userbar.js", ["renderUserbar"]);
  pedir("components/inicio.js", ["renderInicio"]);   // la flecha Volver → INICIO
  // crearSecciones SIEMPRE: el documento (corrido o paginado) se arma
  // con section.js aunque ninguna entrada del REGISTRO lo traiga.
  pedir("componentes/section.js", ["crearSecciones"]);
  enDoc.forEach((s) => {
    s.bloques.filter((b) => b.guardado).forEach((b) => {
      const r = recursoDe(b.recurso);
      pedir(r.archivo, r.imports || [r.funcion]);
    });
  });
  if (esExamen) {
    pedir("utils/opcionMultiple.js", ["obtenerNota", "finalizarExamen", "marcarEnvioPendiente"]);
  }

  const lineasCargar = [...modulos.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([archivo, nombres]) => {
      const lista = [...nombres].sort();
      const destr = archivo === "components/inicio.js" ? "renderInicio" : lista.join(", ");
      return '  const { ' + destr + ' } = await cargar("' + rutaGenerada(archivo) + '", [' +
        lista.map((n) => JSON.stringify(n)).join(", ") + ']);';
    });

  /* ---- cuerpo: una lámina por sección, UNA LÍNEA por bloque ---- */
  const cuerpo = [];
  const varsLamina = [];

  enDoc.forEach((s, i) => {
    const guardados = s.bloques.filter((b) => b.guardado);
    const varL = "l" + (i + 1);
    varsLamina.push(varL);

    const altoLamina = s.h || guardados.reduce((m, b) => Math.max(m, b.y + (b.h || 160)), 120) || 120;
    cuerpo.push("    // ════ Sección " + (i + 1) +
      (s.titulo ? " · «" + s.titulo + "»" : "") +
      " — espacio de " + s.w + "×" + Math.round(altoLamina) + " px ════");
    cuerpo.push("    const " + varL + " = lamina(" + Math.round(altoLamina) + ", " + s.w + ");");
    cuerpo.push("");

    guardados.forEach((b) => {
      const r = recursoDe(b.recurso);
      lineaDeBloque(r, b, varL, s.w).forEach((l) => cuerpo.push(l));
    });
  });

  /* ---- opciones de crearSecciones (del DOCUMENTO) ---- */
  const o = estado.opciones || {};
  const opciones = [
    "    contenedor: lienzo,",
    "    secciones: [" + varsLamina.join(", ") + "],",
  ];
  if (o.avance && o.avance !== "estandar") opciones.push('    avance: "' + o.avance + '",');
  if (o.tarjeta) opciones.push("    tarjeta: true,");
  if (o.mostrarContador === false) opciones.push("    mostrarContador: false,");
  if (o.posicionFlechas && o.posicionFlechas !== "abajo") opciones.push('    posicionFlechas: "' + o.posicionFlechas + '",');

  const fecha = new Date().toLocaleDateString("es", { year: "numeric", month: "long", day: "numeric" });

  /* ---- código de la PÁGINA COMPLETA ---- */
  const salida = [
    "// ============================================================",
    "// " + etiquetaTipo + " generada con el editor «Crear» — Mis Clases Online",
    "// Tipo: " + estado.tipo + " · ID: " + (estado.id || "—") + " · Título: " + tituloPagina,
    "// Fecha: " + fecha,
    "//",
    "// CÓMO USARLO",
    "//   1. Guarda este archivo (con el nombre del ID) 3 carpetas",
    "//      dentro de donde está js/:  clases/{grado}/{materia}/" + nombreArchivo(),
    "//      p. ej.  public/clases/8/algebra/" + nombreArchivo() + "  — desde ahí",
    "//      las rutas ../../../js/… apuntan a la carpeta js/ del",
    "//      proyecto (ahí están components, componentes y utils).",
    "//   2. Se abre desde «" + (esExamen ? "Exámenes" : estado.tipo === "tarea" ? "Tareas" : "Clases") +
      "» con render(perfil, contenedor, clase).",
    "//",
    "// CARGA A PRUEBA DE RUTAS: los módulos NO se importan arriba",
    "// (un archivo faltante mataba la página entera con «Failed to",
    "// fetch…»). Se cargan con cargar(), que reintenta sin caché,",
    "// verifica las exportaciones y avisa el motivo exacto.",
    "//",
    "// PARA AGREGAR UN BLOQUE NUEVO (dentro de montar()):",
    "//   1. si su fábrica aún no está, UNA línea cargar() más —",
    '//        const { crearParrafo } = await cargar("../../../js/componentes/parrafo.js", ["crearParrafo"]);',
    "//   2. UNA línea del bloque, dentro de su lámina —",
    '//        crearParrafo({ texto: "…", contenedor: pon(l1, 0, 240, 820) });',
    "// (las posiciones y medidas en px salieron del editor al guardar).",
    "// ============================================================",
    "",
    "let estilosListos = false;",
    "",
    "function inyectarEstilos() {",
    "  if (estilosListos) return;",
    "  estilosListos = true;",
    '  const estilo = document.createElement("style");',
    '  estilo.id = "mco-generada-estilos";',
    "  estilo.textContent = `",
    "    .mco-generada {",
    "      max-width: " + ANCHO_LIENZO + "px;",
    "      margin: 0 auto;",
    "      padding: 1.25rem clamp(1rem, 4vw, 2rem) 2.5rem;",
    "      font-family: system-ui, sans-serif;",
    "    }",
    "    .cg-volver {",
    "      display: inline-flex; align-items: center; gap: .3rem;",
    "      border: 1px solid #e5e7eb; background: #ffffff; color: #4b5563;",
    "      border-radius: 999px; padding: .42rem .85rem;",
    "      font-size: .85rem; font-weight: 600; cursor: pointer;",
    "      margin-bottom: 1rem;",
    "    }",
    "    .cg-volver:hover { border-color: #7c3aed; color: #7c3aed; }",
    "    .cg-aviso {",
    "      display: flex; align-items: center; gap: .4rem;",
    "      border: 2px solid #dc2626; background: #fef2f2; color: #b91c1c;",
    "      border-radius: .7rem; padding: .6rem .8rem;",
    "      font-size: .85rem; font-weight: 600; margin-bottom: 1rem;",
    "    }",
    "    .cg-aviso[hidden] { display: none; }",
    "    .cg-fallo {",
    "      border: 2px solid #dc2626; background: #fef2f2; color: #b91c1c;",
    "      border-radius: .8rem; padding: .9rem 1rem; font-size: .9rem;",
    "      line-height: 1.5; margin-bottom: 1rem;",
    "    }",
    "    .cg-fallo b { display: block; margin-bottom: .3rem; }",
    "    .cg-lienzo { position: relative; isolation: isolate; }",
    "    .cg-lamina { position: relative; }",
    "    .cg-bloque { position: absolute; z-index: 1; }",
    "    .cg-fondo { position: absolute; z-index: 0; }",
    ...(esExamen
      ? [
          "    .cg-envio { margin-top: 1.6rem; text-align: center; }",
          "    .cg-enviar {",
          "      display: inline-flex; align-items: center; gap: .4rem;",
          "      background: #16a34a; border: 1px solid #16a34a; color: #ffffff;",
          "      font: inherit; font-size: 1rem; font-weight: 800;",
          "      border-radius: .7rem; padding: .7rem 1.6rem; cursor: pointer;",
          "      box-shadow: 0 6px 18px rgba(22, 163, 74, .25);",
          "    }",
          "    .cg-enviar:hover { background: #15803d; }",
          "    .cg-enviar[disabled] { opacity: .55; cursor: default; box-shadow: none; }",
          "    .cg-envio-nota { margin: .5rem 0 0; font-size: .78rem; color: #9ca3af; }",
          "    .cg-enviado {",
          "      display: flex; align-items: center; gap: .5rem;",
          "      border: 2px solid #16a34a; background: #f0fdf4; color: #15803d;",
          "      border-radius: .7rem; padding: .6rem .9rem;",
          "      font-size: .9rem; font-weight: 700; margin-bottom: 1rem;",
          "    }",
          "    .cg-enviado[hidden] { display: none; }",
        ]
      : []),
    "  `;",
    "  document.head.append(estilo);",
    "}",
    "",
    "// ─── Carga de módulos A PRUEBA DE RUTAS (con reintento) ───",
    "",
    "const MCO_MODULOS = new Map();",
    "",
    "async function cargar(spec, nombres) {",
    "  if (!MCO_MODULOS.has(spec)) {",
    "    MCO_MODULOS.set(",
    "      spec,",
    "      import(spec).catch(() => {",
    "        // reintento ÚNICO sin caché (Live Server recién arrancado…)",
    "        const url = spec + (spec.includes(\"?\") ? \"&\" : \"?\") + \"mco=\" + Date.now();",
    "        return import(url).catch(() => {",
    '          throw new Error("No se pudo cargar " + spec + " — revisa que ese archivo exista en tu proyecto (viene en la entrega) y recarga con F5.");',
    "        });",
    "      })",
    "    );",
    "  }",
    "  const mod = await MCO_MODULOS.get(spec);",
    "  const faltan = (nombres || []).filter((n) => typeof mod[n] !== \"function\");",
    "  if (faltan.length) {",
    '    throw new Error("El archivo " + spec + " SÍ está, pero no exporta " + faltan.join(", ") + ": es una copia vieja. Reemplázalo con el de la última entrega y recarga (F5).");',
    "  }",
    "  return mod;",
    "}",
    "",
    "// ─── Ayudantes (incluidos para que agregar bloques sea fácil) ───",
    "",
    "// Una LÁMINA (sección) del documento: su ESPACIO en px.",
    "// El documento completo mide " + ANCHO_LIENZO + "; con ancho menor se respeta.",
    "function lamina(altoPx, anchoPx) {",
    '  const d = document.createElement("div");',
    '  d.className = "cg-lamina";',
    '  if (altoPx) d.style.minHeight = Math.round(altoPx) + "px";',
    '  if (anchoPx && anchoPx < ' + ANCHO_LIENZO + ') d.style.width = Math.round(anchoPx) + "px";',
    "  return d;",
    "}",
    "",
    "// La CAJA de un bloque dentro de la lámina: posición y medida en",
    "// px (las que salieron del editor). Pásasela como `contenedor`.",
    "function pon(laminaDestino, x, y, ancho, alto) {",
    '  const caja = document.createElement("div");',
    '  caja.className = "cg-bloque";',
    '  caja.style.left = x + "px";',
    '  caja.style.top = y + "px";',
    '  if (ancho) caja.style.width = ancho + "px";',
    '  if (alto) caja.style.minHeight = alto + "px";',
    "  laminaDestino.appendChild(caja);",
    "  return caja;",
    "}",
    "",
    "// Igual que pon() pero para una figura de FONDO (debajo del texto).",
    "function fondo(laminaDestino, x, y) {",
    "  const caja = pon(laminaDestino, x, y);",
    '  caja.className = "cg-fondo";',
    "  return caja;",
    "}",
    "",
  ];

  if (esExamen) {
    salida.push(
      "// ─── EXAMEN: no se puede salir sin ENVIAR ───",
      "// · Volver mientras NO se envió: avisa; si el estudiante INSISTE,",
      "//   el examen se ENVIARÁ con lo que llevaba (lo no respondido",
      "//   queda sin puntos = incorrecto) y recién ahí se sale.",
      "// · Cierre/recarga sin enviar (pagehide): queda la marca local;",
      "//   al volver a entrar la página auto-envía con lo que había.",
      "// · Al cargar: si la nota ya venía enviada (o con respuestas de",
      "//   una salida forzada), todo aparece bloqueado con la nota final.",
      "let examenEnviado = false;",
      "let notaFinal = null;",
      "",
      "function bloquearSalida() {",
      "  window.addEventListener(\"beforeunload\", (e) => {",
      "    if (examenEnviado) return;",
      "    e.preventDefault();",
      '    e.returnValue = "";   // el navegador pide confirmación al cerrar',
      "  });",
      "}",
      ""
    );
  }

  salida.push(
    "// Contenido de la pieza (lo llama la vista al abrirla)",
    "export function render(perfil, contenedor, clase) {",
    "  if (!perfil || !contenedor) return;",
    "  inyectarEstilos();",
    "  contenedor.removeAttribute(\"data-mco-listo\");   // se marca al terminar montar()",
    "",
    "  contenedor.innerHTML = `",
    '    <div class="mco-generada">',
    '      <button class="cg-volver" id="cg-volver" type="button">',
    '        <sl-icon name="arrow-left"></sl-icon> Volver',
    "      </button>",
    ...(esExamen
      ? [
          '      <div class="cg-aviso" id="cg-aviso" hidden>',
          '        <sl-icon name="exclamation-triangle"></sl-icon>',
          "        Debes <b>ENVIAR el examen</b> antes de salir.",
          "      </div>",
          '      <div class="cg-enviado" id="cg-enviado" hidden>',
          '        <sl-icon name="check-circle"></sl-icon>',
          '        <span id="cg-enviado-txt">Examen enviado.</span>',
          "      </div>",
        ]
      : []),
    '      <div class="cg-lienzo" id="cg-lienzo"></div>',
    ...(esExamen
      ? [
          '      <div class="cg-envio" id="cg-envio">',
          '        <button class="cg-enviar" id="cg-enviar" type="button">',
          '          <sl-icon name="send"></sl-icon> Enviar examen',
          "        </button>",
          '        <p class="cg-envio-nota">Al enviar se cierra la prueba y se habilita la flecha Volver.</p>',
          "      </div>",
        ]
      : []),
    "    </div>`;",
    "",
    "  // Todo el montaje es asíncrono (los módulos van con cargar()):",
    "  // si algo falta, la página AVISA en vez de morir en blanco.",
    "  montar(perfil, contenedor, clase).catch((e) => {",
    "    console.warn(\"[mco-generada]\", e);",
    '    const zona = contenedor.querySelector("#cg-lienzo");',
    "    if (zona) {",
    '      const fallo = document.createElement("div");',
    '      fallo.className = "cg-fallo";',
    '      fallo.innerHTML = "<b>No se pudo armar la ' + estado.tipo + '.</b> " + (e && e.message ? e.message : e);',
    "      zona.appendChild(fallo);",
    "    }",
    "  });",
    "}",
    "",
    "async function montar(perfil, contenedor, clase) {",
    "  const lienzo = contenedor.querySelector(\"#cg-lienzo\");",
    "  const volver = contenedor.querySelector(\"#cg-volver\");",
    "",
    "  // ── Módulos usados (con reintento y aviso claro si falta uno) ──",
    ...lineasCargar,
    "",
    '  renderUserbar(perfil, ' + JSON.stringify(tituloPagina) + ');',
    ""
  );

  if (esExamen) {
    salida.push(
      "  const aviso = contenedor.querySelector(\"#cg-aviso\");",
      "  const enviar = contenedor.querySelector(\"#cg-enviar\");",
      "  const bloqueEnviado = contenedor.querySelector(\"#cg-enviado\");",
      "  const bloqueEnviadoTxt = contenedor.querySelector(\"#cg-enviado-txt\");",
      "  const bloqueEnvio = contenedor.querySelector(\"#cg-envio\");",
      "  const esDocente = perfil.rol === \"docente\";",
      "  const tituloExamen = " + JSON.stringify(tituloPagina) + ";",
      "",
      "  // ── Estado del examen en cuanto carga (estudiante) ──",
      "  if (!esDocente && clase && clase.id && perfil.uid) {",
      "    try {",
      "      const nota = await obtenerNota(perfil, clase);",
      "      const respondio = !!(nota && nota.preguntas && Object.keys(nota.preguntas).length);",
      "      if ((nota && nota.enviado) || respondio) {",
      "        // Ya enviado — o salió a la fuerza la vez pasada: se cierra",
      "        // ahora (auto-envío). Lo no respondido quedó sin puntos.",
      "        examenEnviado = true;",
      "        notaFinal = nota ? nota.puntos : null;",
      "        await finalizarExamen(perfil, clase, { titulo: tituloExamen }).catch(() => {});",
      "      } else {",
      "        // Sin enviar: cierre/recarga queda marcado para auto-envío",
      "        window.addEventListener(\"pagehide\", () => {",
      "          marcarEnvioPendiente(perfil, clase);",
      "        });",
      "        bloquearSalida();",
      "      }",
      "    } catch (e) {",
      "      // Sin Firestore o sin permiso: el examen queda disponible y",
      "      // con el bloqueo de salida activo (mejor esfuerzo).",
      "      window.addEventListener(\"pagehide\", () => {",
      "        marcarEnvioPendiente(perfil, clase);",
      "      });",
      "      bloquearSalida();",
      "    }",
      "  }",
      "",
      "  if (examenEnviado) {",
      "    aviso.hidden = true;",
      "    if (bloqueEnvio) bloqueEnvio.hidden = true;",
      "    if (bloqueEnviado) {",
      "      bloqueEnviado.hidden = false;",
      "      bloqueEnviadoTxt.textContent =",
      "        notaFinal == null ? \"Examen enviado.\" : \"Examen enviado · Nota final: \" + notaFinal + \" pts.\";",
      "    }",
      "  }",
      "",
      "  // ── ENVIAR: cierra la prueba y habilita la salida ──",
      "  if (enviar) {",
      "    enviar.addEventListener(\"click\", async () => {",
      "      if (examenEnviado) return;",
      "      examenEnviado = true;",
      "      enviar.disabled = true;",
      "      enviar.innerHTML = '<sl-icon name=\"check-lg\"></sl-icon> Examen enviado';",
      "      try {",
      "        const res = await finalizarExamen(perfil, clase, { titulo: tituloExamen });",
      "        notaFinal = res && typeof res.puntos === \"number\" ? res.puntos : null;",
      "      } catch (e) { /* igual queda enviado en local */ }",
      "      aviso.hidden = true;",
      "      if (bloqueEnvio) bloqueEnvio.hidden = true;",
      "      if (bloqueEnviado) {",
      "        bloqueEnviado.hidden = false;",
      "        bloqueEnviadoTxt.textContent =",
      "          notaFinal == null ? \"Examen enviado.\" : \"Examen enviado · Nota final: \" + notaFinal + \" pts.\";",
      "      }",
      '      volver.scrollIntoView({ behavior: "smooth", block: "center" });',
      "    });",
      "  }",
      "",
      "  // ── VOLVER: sin enviar NO se sale; si insiste, se envía lo que hay ──",
      "  volver.addEventListener(\"click\", async () => {",
      "    if (!examenEnviado && !esDocente) {",
      "      aviso.hidden = false;",
      '      aviso.scrollIntoView({ behavior: "smooth", block: "center" });',
      "      const salir = window.confirm(",
      "        \"No has ENVIADO el examen.\\n\\n\" +",
      "        \"Si sales ahora, el examen se ENVIARÁ con lo que llevas \" +",
      "        \"y lo que no respondiste quedará como incorrecto (0).\\n\\n\" +",
      "        \"¿Salir y enviar?\"",
      "      );",
      "      if (!salir) return;   // se queda a terminar",
      "      examenEnviado = true;",
      "      try { await finalizarExamen(perfil, clase, { titulo: tituloExamen }); } catch (e) {}",
      "    }",
      "    renderUserbar(perfil);",
      "    renderInicio(perfil, contenedor);",
      "  });",
      ""
    );
  } else {
    salida.push(
      "  // ── Volver: la flecha al INICIO (la llevan clase, tarea y examen) ──",
      "  volver.addEventListener(\"click\", () => {",
      "    renderUserbar(perfil);",
      "    renderInicio(perfil, contenedor);",
      "  });",
      ""
    );
  }

  salida.push(
    ...cuerpo,
    "  // ── Documento final: CORRIDO con 1 sección; con 2 o más, una a la vez ──",
    "  crearSecciones({",
    ...opciones,
    "  });",
    "",
    "  contenedor.setAttribute(\"data-mco-listo\", \"1\");   // TODO quedó montado",
    "}"
  );

  return salida.join("\n").replace(/\n{3,}/g, "\n\n");
}

function descargarArchivo(nombre, texto) {
  const bola = new Blob([texto], { type: "text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(bola);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function abrirModalCodigo() {
  const hayGuardados = estado.secciones.some((s) => s.bloques.some((b) => b.guardado));
  if (!hayGuardados) {
    notify("Primero GUARDA al menos un bloque dentro de una sección: el código se genera con los bloques guardados.", "warning");
    return;
  }

  let fuente;
  try {
    fuente = generarCodigoFuente();
  } catch (e) {
    console.warn("[crear] código:", e);
    notify("No se pudo generar el código: " + (e.message || e), "danger");
    return;
  }

  const fondoM = document.createElement("div");
  fondoM.className = "cr-modal-fondo";
  fondoM.innerHTML = `
    <div class="cr-modal" role="dialog" aria-label="Código generado">
      <div class="cr-modal-cab">
        <sl-icon name="file-earmark-code"></sl-icon>
        <span>Código generado — ${esc(nombreArchivo())}</span>
        <span class="c-crece"></span>
        <button class="crear-btn" id="cr-cerrar" title="Cerrar"><sl-icon name="x-lg"></sl-icon></button>
      </div>
      <div class="cr-modal-cuerpo"><pre id="cr-codigo"></pre></div>
      <div class="cr-modal-pie">
        <span class="c-crece"></span>
        <button class="crear-btn" id="cr-copiar"><sl-icon name="clipboard"></sl-icon> Copiar</button>
        <button class="crear-btn primario" id="cr-bajar"><sl-icon name="download"></sl-icon> Todo bien, descargar .js</button>
      </div>
    </div>`;
  document.body.appendChild(fondoM);

  fondoM.querySelector("#cr-codigo").textContent = fuente;

  const cerrar = () => fondoM.remove();
  fondoM.addEventListener("click", (e) => { if (e.target === fondoM) cerrar(); });
  fondoM.querySelector("#cr-cerrar").addEventListener("click", cerrar);
  fondoM.querySelector("#cr-copiar").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(fuente);
      notify("Código copiado al portapapeles.", "success");
    } catch (e) {
      notify("No se pudo copiar: selecciona el código y cópialo a mano.", "warning");
    }
  });
  fondoM.querySelector("#cr-bajar").addEventListener("click", () => {
    descargarArchivo(nombreArchivo(), fuente);
    notify("Archivo «" + nombreArchivo() + "» descargado.", "success");
  });
}
/* ============================================================
   RECURSOS AGREGADOS (bloques pegados AL FINAL de crear.js)
   ------------------------------------------------------------
   Cada recurso nuevo entra AQUÍ como un BLOQUE numerado más:
   su caja (() => { … })() con marca de INICIO y FIN, su
   REGISTRO.push({...}) y su validar() con lo OBLIGATORIO.
   La PUERTA DE GUARDADO (abajo de todo) revisa el validar de
   TODOS los bloques: si falta algo, Guardar no pasa.
   ============================================================ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 34 · «graficos» — Gráficos (15 tipos)   [visuales]
   Obligatorio: según el TIPO elegido — etiquetas en 11 tipos,
   líneas/área con etiquetas O eje X numérico, cantidades que
   coincidan, velas 4 números por fila, burbujas 3, dispersión
   puntos x,y, pastel/dona > 0, radar con 3+ etiquetas… También
   marca ● en vivo y cambia el ejemplo de «Valores» por tipo.
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  /* ── Ayudantes SOLO de este bloque (viven dentro del paréntesis:
        no tocan nada del crear.js base y no chocan con otros bloques) ── */
  const limpia = (v) => String(v ?? "").trim();
  const lista = (v) => {
    const s = limpia(v);
    return s ? s.split(",").map((p) => p.trim()).filter(Boolean) : undefined;
  };
  const numeros = (v) => {
    const l = lista(v);
    if (!l) return undefined;
    const nums = l.map((p) => Number(p));
    return nums.every((n) => Number.isFinite(n)) ? nums : undefined;
  };
  /* «3, 7, 5» → [3,7,5] (simple) · «4,6; 7,2» → [[4,6],[7,2]]
     (series o puntos) · «[...]» JSON tal cual (casos especiales) */
  const valores = (v) => {
    const s = limpia(v);
    if (!s) return undefined;
    if (s.startsWith("[")) {
      try { const j = JSON.parse(s); if (Array.isArray(j)) return j; } catch (_) {}
    }
    const filas = s.split(";").map((p) => p.trim()).filter(Boolean);
    if (filas.length > 1) {
      return filas.map((f) => f.split(",").map((p) => Number(p.trim())));
    }
    const nums = filas[0].split(",").map((p) => Number(p.trim()));
    return nums.some((n) => !Number.isFinite(n)) ? undefined : nums;
  };

  /* Tipos que SIEMPRE necesitan etiquetas (dispersión y burbujas no
     las dibujan; líneas/área las pueden cambiar por el eje X numérico). */
  const REQ_ETIQUETAS = [
    "columnas", "barras", "barras-agrupadas", "barras-apiladas",
    "lineas-temporales", "histograma", "pastel", "dona", "radar", "velas", "cascada",
  ];
  const CARTESIANAS_CON_X = ["lineas", "area"];
  const EJ_VALORES = {
    "columnas": "3, 7, 5 · series: 4,6; 7,2",
    "barras": "3, 7, 5 · series: 4,6; 7,2",
    "barras-agrupadas": "4,6; 7,2 (una fila por etiqueta)",
    "barras-apiladas": "4,6; 7,2 (una fila por etiqueta)",
    "lineas": "3, 7, 5 · con X: 2,4; 0,1; 5,6",
    "lineas-temporales": "3, 7, 5 · series: 4,6; 7,2",
    "area": "3, 7, 5 · con X: 2,4; 0,1; 5,6",
    "pastel": "30, 20, 10 (positivos)",
    "dona": "30, 20, 10 (positivos)",
    "dispersion": "puntos x,y: 2,3; 4,5; 6,3.5",
    "burbujas": "x,y,tamaño: 1,2,10; 3,4,20",
    "histograma": "3, 7, 5",
    "radar": "4,6; 7,2 (mínimo 3 etiquetas)",
    "velas": "10,12,8,11; 11,13,9,12",
    "cascada": "100, -20, 30 (sin series)",
  };

  const esNumero = (n) => typeof n === "number" && Number.isFinite(n);
  const sonNumeros = (a) => Array.isArray(a) && a.length > 0 && a.every(esNumero);

  /* Devuelve [{ k, msg }] con TODO lo que le falta al gráfico elegido.
     k = campo del formulario que hay que marcar en rojo. */
  function validarGraficos(v) {
    const errs = [];
    const tipo = limpia(v.tipo);
    if (!tipo) {
      errs.push({ k: "tipo", msg: "Elige el tipo de gráfico (está en blanco)." });
      return errs;
    }
    const ej = EJ_VALORES[tipo] || "3, 7, 5";
    const et = lista(v.etiquetas) || [];
    const escribioX = limpia(v.x) !== "";
    const xs = numeros(v.x);
    const textoVal = limpia(v.valores);
    if (!textoVal) {
      errs.push({ k: "valores", msg: "«Valores» es obligatorio — ej: " + ej });
      return errs;
    }
    const val = valores(textoVal);
    if (val === undefined) {
      errs.push({ k: "valores", msg: "No pude leer «Valores»: usa números separados por comas (y «;» para series/puntos) — ej: " + ej });
      return errs;
    }

    // 1) Etiquetas: obligatorias, opcionales o alternativas según el tipo.
    if (REQ_ETIQUETAS.includes(tipo) && !et.length) {
      errs.push({ k: "etiquetas", msg: "«Etiquetas» es obligatorio para «" + tipo + "» — ej: Ene, Feb, Mar" });
    }
    if (CARTESIANAS_CON_X.includes(tipo)) {
      if (escribioX && xs === undefined) {
        errs.push({ k: "x", msg: "El eje X numérico debe ser solo números — ej: 0, 2, 4, 6" });
      } else if (!et.length && !xs) {
        errs.push({ k: "etiquetas", msg: "Para «" + tipo + "» necesitas etiquetas O un eje X numérico (campo «Eje X numérico»)." });
      } else if (et.length && xs && et.length !== xs.length) {
        errs.push({ k: "x", msg: "«x» tiene " + xs.length + " valores y hay " + et.length + " etiquetas — usa solo una de las dos (o iguálalas)." });
      }
    }

    // 2) Cantidades: las filas de valores deben coincidir con las etiquetas
    //    (o con el eje X). Dispersión y burbujas no: sus puntos van solos.
    const cuentaEje = REQ_ETIQUETAS.includes(tipo) ? et.length : (xs && xs.length) || et.length;
    const dispersionBurbujas = tipo === "dispersion" || tipo === "burbujas";
    if (cuentaEje && !dispersionBurbujas && val.length !== cuentaEje) {
      errs.push({ k: "valores", msg: "Hay " + cuentaEje + " etiquetas y " + val.length + " valores — las dos listas deben coincidir." });
      return errs;
    }
    if (dispersionBurbujas && et.length && val.length !== et.length) {
      errs.push({ k: "valores", msg: "Hay " + et.length + " etiquetas y " + val.length + " puntos — las dos listas deben coincidir (o borra las etiquetas)." });
      return errs;
    }

    // 3) Forma de los valores según el tipo (lo MISMO que exige el visual).
    const filas = val.map((f) => (Array.isArray(f) ? f : [f]));
    const todasNumeros = filas.every((f) => f.every(esNumero));
    if (tipo === "velas") {
      if (!val.every((f) => sonNumeros(f) && f.length >= 4)) {
        errs.push({ k: "valores", msg: "Cada vela necesita 4 números [apertura, cierre, máximo, mínimo], separadas por «;» — ej: " + EJ_VALORES.velas });
      }
    } else if (tipo === "burbujas") {
      if (!val.every((f) => sonNumeros(f) && f.length >= 3)) {
        errs.push({ k: "valores", msg: "Cada burbuja necesita 3 números [x, y, tamaño], separadas por «;» — ej: " + EJ_VALORES.burbujas });
      }
    } else if (tipo === "dispersion") {
      if (!val.every((f) => sonNumeros(f) && f.length >= 2)) {
        errs.push({ k: "valores", msg: "Cada punto necesita 2 números [x, y], separados por «;» — ej: " + EJ_VALORES.dispersion });
      }
    } else if (tipo === "cascada") {
      if (val.some(Array.isArray) || !todasNumeros) {
        errs.push({ k: "valores", msg: "La cascada solo acepta números simples (sin «;» ni series) — ej: " + EJ_VALORES.cascada });
      }
    } else if (tipo === "pastel" || tipo === "dona") {
      if (!todasNumeros || filas.some((f) => f.some((nn) => !(esNumero(nn) && nn > 0)))) {
        errs.push({ k: "valores", msg: "«" + tipo + "» necesita valores MAYORES que cero — ej: " + EJ_VALORES.pastel });
      }
    } else if (!todasNumeros) {
      errs.push({ k: "valores", msg: "Todos los valores deben ser números — ej: " + ej });
    }

    // 4) Radar: mínimo 3 ejes.
    if (tipo === "radar" && et.length > 0 && et.length < 3) {
      errs.push({ k: "etiquetas", msg: "El radar necesita al menos 3 etiquetas." });
    }
    return errs;
  }

  if (!REGISTRO.some((r) => r.id === "graficos")) {
    REGISTRO.push({
      id: "graficos",
      nombre: "Gráficos (15 tipos)",
      cat: "visuales",
      archivo: "recursos/js/visuales/generador-graficos-universal.js",
      imports: ["dibujarGrafico"],
      funcion: "dibujarGrafico",
      descripcion: "Columnas, barras, líneas, pastel, dispersión y más. SVG nativo; ejes numéricos con rango y escala (velocidad-tiempo).",
      params: [
        { k: "tipo", et: "Tipo de gráfico", tipo: "opcion", req: true, def: "columnas",
          ops: ["columnas", "barras", "barras-agrupadas", "lineas", "lineas-temporales",
                "area", "pastel", "dona", "barras-apiladas", "dispersion", "burbujas",
                "histograma", "radar", "velas", "cascada"] },
        { k: "titulo", et: "Título (si no, no se dibuja)", tipo: "texto", ej: "Velocidad contra tiempo" },
        { k: "etiquetas", et: "Etiquetas (coma; sobran si usas X numérico)", tipo: "texto", ej: "Ene, Feb, Mar" },
        { k: "valores", et: "Valores (coma = dato; «;» = series o puntos; vale JSON)", tipo: "texto", req: true,
          ej: "3, 7, 5 · series: 4,6; 7,2 · puntos: 2,3; 4,5" },
        { k: "x", et: "Eje X numérico: valores de x (líneas y área)", tipo: "texto", ej: "0, 1, 2, 3, 4, 5" },
        { k: "series", et: "Nombres de las series (coma)", tipo: "texto", ej: "2025, 2026" },
        { k: "colores", et: "Colores propios (coma)", tipo: "texto", ej: "#7c3aed, #0ea5e9" },
        { k: "ejeVertical", et: "Nombre del eje vertical (Y)", tipo: "texto", ej: "Velocidad (m/s)" },
        { k: "ejeHorizontal", et: "Nombre del eje horizontal (X)", tipo: "texto", ej: "Tiempo (s)" },
        { k: "ejeMin", et: "Eje de valores: mínimo", tipo: "num", ej: "0" },
        { k: "ejeMax", et: "Eje de valores: máximo", tipo: "num", ej: "20" },
        { k: "ejePaso", et: "Eje de valores: escala (paso entre marcas)", tipo: "num", ej: "5" },
        { k: "ejeMinX", et: "Eje X numérico: mínimo", tipo: "num", ej: "0" },
        { k: "ejeMaxX", et: "Eje X numérico: máximo", tipo: "num", ej: "10" },
        { k: "ejePasoX", et: "Eje X numérico: escala (paso entre marcas)", tipo: "num", ej: "2" },
        { k: "mostrarCantidades", et: "Mostrar los valores", tipo: "sino" },
        { k: "mostrarPorcentajes", et: "Mostrar porcentajes", tipo: "sino" },
        { k: "total", et: "Total para los porcentajes (vacío = suma)", tipo: "num" },
        { k: "ancho", et: "Ancho del gráfico (px)", tipo: "num", def: 560, ej: "560" },
      ],
      aOpciones: (v) => ({
        tipo: v.tipo || "columnas",
        titulo: limpia(v.titulo) || undefined,
        etiquetas: lista(v.etiquetas),
        valores: valores(v.valores),
        x: numeros(v.x),
        series: lista(v.series),
        colores: lista(v.colores),
        ancho: num(v.ancho),
        mostrarCantidades: bool(v.mostrarCantidades) || undefined,
        mostrarPorcentajes: bool(v.mostrarPorcentajes) || undefined,
        total: num(v.total),
        ejes: {
          horizontal: limpia(v.ejeHorizontal) || undefined,
          vertical: limpia(v.ejeVertical) || undefined,
          min: num(v.ejeMin),
          max: num(v.ejeMax),
          paso: num(v.ejePaso),
          minX: num(v.ejeMinX),
          maxX: num(v.ejeMaxX),
          pasoX: num(v.ejePasoX),
        },
      }),
      /* ── A PRUEBA DE ERRORES: lo obligatorio según el TIPO elegido ── */
      validar: validarGraficos,
    });
  }

  /* ── Marcas ● en vivo: el formulario muestra como obligatorio (●)
        solo lo que el tipo elegido pide, y cambia el ejemplo de
        «Valores» para que se vea el formato correcto. ── */
  function envolturaDe(form, campo) {
    let n2 = campo;
    while (n2 && n2.parentElement && n2.parentElement !== form) n2 = n2.parentElement;
    return n2;
  }
  function marcar(form, k, req) {
    const campo = form.querySelector('[data-k="' + k + '"]');
    if (!campo) return;
    const env = envolturaDe(form, campo);
    const label = env && env.querySelector("label");
    if (!label) return;
    if (!!label.querySelector(".req") === req) return;
    const viejo = label.querySelector(".req, .op");
    if (viejo) viejo.remove();
    const s = document.createElement("span");
    if (req) { s.className = "req"; s.title = "Obligatorio"; s.textContent = "●"; }
    else { s.className = "op"; s.textContent = "(opcional)"; }
    label.appendChild(document.createTextNode(" "));
    label.appendChild(s);
  }
  function refrescarRequisitos(form, b) {
    const v = b.valores || {};
    const tipo = limpia(v.tipo) || "columnas";
    const et = lista(v.etiquetas) || [];
    const xs = numeros(v.x);
    const conX = CARTESIANAS_CON_X.includes(tipo);
    marcar(form, "etiquetas", REQ_ETIQUETAS.includes(tipo) ? true : conX ? !xs : false);
    marcar(form, "x", conX && !et.length);
    const campoV = form.querySelector('[data-k="valores"]');
    if (campoV && EJ_VALORES[tipo]) campoV.placeholder = EJ_VALORES[tipo];
  }

  /* ── Cierre de seguridad (pegar el bloque dos veces no duplica
        las marcas en vivo). ── */
  if (!formularioEl.__graficosVal) {
    const formularioElBase = formularioEl;
    formularioEl = function (b, r, medida) {
      const form = formularioElBase(b, r, medida);
      if (r && r.id === "graficos") {
        const refrescar = () => refrescarRequisitos(form, b);
        form.addEventListener("input", refrescar);
        form.addEventListener("change", refrescar);
        refrescar();
      }
      return form;
    };
    formularioEl.__graficosVal = true;
  }
})();
/* ═════════════════════ fin BLOQUE 34 · «graficos» ═══════════════════ */

/* ============================================================
   PUERTA DE GUARDADO — a prueba de errores, para TODOS los bloques
   ------------------------------------------------------------
   Antes de guardar revisa validar(valores) DEL bloque: si trae
   errores, marca esos campos en rojo, muestra el aviso claro y
   NO guarda (no mide, no monta vista previa). Los bloques sin
   validar se guardan como siempre. La puerta se instala UNA
   sola vez aunque el archivo se pegue dos veces.
   ============================================================ */
(() => {
  if (guardarBloque.__puertaVal) return;
  const guardarBloqueBase = guardarBloque;
  guardarBloque = async function (b, form) {
    const r = recursoDe(b.recurso);
    if (r && typeof r.validar === "function") {
      const errs = r.validar(b.valores || {}) || [];
      if (errs.length) {
        errs.forEach((e) => {
          const c = form.querySelector('[data-k="' + e.k + '"]');
          if (c) c.classList.add("error");
        });
        notify(errs.map((e) => e.msg).join(" "), "warning");
        return;
      }
    }
    return guardarBloqueBase(b, form);
  };
  guardarBloque.__puertaVal = true;
  guardarBloque.__graficosVal = true;   // por si arriba queda pegado el bloque viejo de gráficos
})();

/* ▼ Para agregar OTRO recurso: pega aquí abajo el siguiente BLOQUE
   numerado — (() => { REGISTRO.push({ …, validar: … }); })() — con su
   marca de inicio/fin y su validar. La puerta ya lo cubre. ▼ */
/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 35 · «graficador-funciones-cartesianas» — Plano cartesiano
   de funciones   [visuales]   · v2 con RECORTES de porción
   Visual: recursos/js/visuales/graficador-funciones-cartesianas.js
   (SVG nativo, cero librerías, cero eventos: cuadrícula según la
   escala, ejes negros numerados, funciones en CUALQUIER formato —
   explícitas, canónicas, cónicas e implícitas sin despejar—, áreas
   de dominio/entre curvas, puntos con letra, acotaciones punteadas
   y RECORTES: cada función se puede CORTAR a la porción donde x y/o
   y vale entre dos valores dados).
   Obligatorio: ESCALA > 0 · si escribes rangos, mín < máx ·
   cuadrantes solo 1-4 · cada ecuación debe interpretarse (revisor de
   sintaxis espejo del motor) · colores hex o nombre · acotaciones
   «x:a,b; y:c» sin variables · recorte «x:a,b; y:c,d» con DOS
   valores por eje, sin variables y sin repetir el mismo valor (si
   llegan al revés el visual los acomoda solos) · áreas «entre»
   (curvas y=…) o «region» (desigualdad o rangos x=a..b) · puntos
   «A(x,y)» con coordenadas numéricas. La PUERTA DE GUARDADO usa
   validar() de aquí abajo.
   Si ya pegaste el BLOQUE 35 ANTERIOR, este lo REEMPLAZA solo
   (mismo id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
   (() => {
    /* ── Ayudantes SOLO de este bloque (no tocan nada del crear.js base) ── */
    const limpia = (v) => String(v ?? "").trim();
    const lineasDe = (v) => limpia(v).split("\n").map((s) => s.trim()).filter(Boolean);
    const listaCuadrantes = (v) => {
      const nums = limpia(v).split(",").map((s) => Number(s.trim()))
        .filter((n) => n >= 1 && n <= 4);
      return nums.length ? nums : undefined;
    };
  
    /* ══ Revisor de sintaxis COMPACTO — ESPEJO del motor del visual.
       Tokeniza y parsea SOLO para detectar errores ANTES de guardar;
       no evalúa nada. Mismas reglas: ²→^2, √→sqrt, π→pi, sen→sin,
       multiplicación implícita (2x, 2(x+1), xy), |abs|, x^-2… ══ */
    const FN = ["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh",
      "sqrt", "cbrt", "abs", "ln", "log", "log10", "exp", "floor", "ceil", "round", "sign"];
    const ALIAS = { sen: "sin", senh: "sinh", tg: "tan", arcsen: "asin", arccos: "acos", arctg: "atan", raiz: "sqrt" };
    const CTE = ["pi", "e", "tau"];
    const PALABRAS = [...new Set([...FN, ...Object.keys(ALIAS), ...CTE])].sort((a, b) => b.length - a.length);
  
    /* Devuelve la lista de símbolos o LANZA con el motivo exacto. */
    function tokenizarCompacto(texto) {
      let t = String(texto ?? "").toLowerCase().trim();
      t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (const [re, s] of [[/²/g, "^2"], [/³/g, "^3"], [/⁴/g, "^4"], [/⁵/g, "^5"],
        [/√/g, "sqrt"], [/π/g, "pi"], [/×|·/g, "*"], [/÷/g, "/"],
        [/−|–|—/g, "-"], [/≥/g, ">="], [/≤/g, "<="]]) t = t.replace(re, s);
      t = t.replace(/(\d)\s*,\s*(\d)/g, "$1.$2");
      const toks = [];
      const esDig = (c) => c >= "0" && c <= "9";
      let i = 0;
      while (i < t.length) {
        const c = t[i];
        if (c === " ") { i++; continue; }
        if (esDig(c) || (c === "." && esDig(t[i + 1] ?? ""))) {
          let j = i;
          while (j < t.length && (esDig(t[j]) || t[j] === ".")) j++;
          if (t[j] === "e" && (esDig(t[j + 1] ?? "") || ((t[j + 1] === "+" || t[j + 1] === "-") && esDig(t[j + 2] ?? "")))) {
            j += 2;
            while (j < t.length && esDig(t[j])) j++;
          }
          if (!Number.isFinite(Number(t.slice(i, j)))) throw new Error("«" + t.slice(i, j) + "» no es un número válido");
          toks.push({ t: "num", v: 0 });
          i = j;
          continue;
        }
        if (c === "x" || c === "y") { toks.push({ t: "var", v: c }); i++; continue; }
        if (c >= "a" && c <= "z") {
          const resto = t.slice(i);
          const palabra = PALABRAS.find((p) => resto.startsWith(p));
          if (palabra) {
            const canon = ALIAS[palabra] || palabra;
            toks.push(FN.includes(canon) ? { t: "fn", v: canon } : { t: "cte", v: canon });
            i += palabra.length;
            continue;
          }
          throw new Error("no reconozco «" + ((resto.match(/^[a-z]+/) || ["?"])[0]) + "»: las variables son x y y; funciones como sin, cos, tan, sqrt, abs, ln, log, exp (también sen, tg, raiz)");
        }
        if (c === "(" || c === ")") { toks.push({ t: "pa", v: c }); i++; continue; }
        if (c === "|") { toks.push({ t: "barra" }); i++; continue; }
        if ("^*/+-".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
        if (c === ">") { toks.push({ t: "comp", v: t[i + 1] === "=" ? ">=" : ">" }); i += t[i + 1] === "=" ? 2 : 1; continue; }
        if (c === "<") { toks.push({ t: "comp", v: t[i + 1] === "=" ? "<=" : "<" }); i += t[i + 1] === "=" ? 2 : 1; continue; }
        if (c === "=") { toks.push({ t: "igual" }); i++; continue; }
        throw new Error("no acepto el símbolo «" + c + "»");
      }
      /* multiplicación implícita (misma regla que el visual, con estado
         de barras para que y=|x| no se rompa) */
      const conMult = [];
      let barraAbierta = false;
      for (const tk of toks) {
        const prev = conMult[conMult.length - 1];
        const prevCierra = prev && (prev.t === "num" || prev.t === "var" || prev.t === "cte" ||
          (prev.t === "pa" && prev.v === ")") ||
          (prev.t === "barra" && !barraAbierta));
        const tkAbre = tk && (tk.t === "num" || tk.t === "var" || tk.t === "cte" ||
          tk.t === "fn" || (tk.t === "pa" && tk.v === "(") ||
          (tk.t === "barra" && !barraAbierta));
        if (tk.t === "barra") {
          if (prevCierra && tkAbre) conMult.push({ t: "op", v: "*" });
          barraAbierta = !barraAbierta;
          conMult.push(tk);
          continue;
        }
        if (prev && prevCierra && tkAbre) conMult.push({ t: "op", v: "*" });
        conMult.push(tk);
      }
      return conMult;
    }
  
    function revisarCadena(toks) {
      let pos = 0;
      const mirar = () => toks[pos];
      function expr() {
        termino();
        while (mirar() && mirar().t === "op" && (mirar().v === "+" || mirar().v === "-")) { pos++; termino(); }
      }
      function termino() {
        factor();
        while (mirar() && mirar().t === "op" && (mirar().v === "*" || mirar().v === "/")) { pos++; factor(); }
      }
      function factor() {
        if (mirar() && mirar().t === "op" && (mirar().v === "-" || mirar().v === "+")) { pos++; factor(); return; }
        potencia();
      }
      function potencia() {
        atomo();
        if (mirar() && mirar().t === "op" && mirar().v === "^") { pos++; factor(); }
      }
      function atomo() {
        const tk = mirar();
        if (!tk) throw new Error("la expresión termina antes de lo esperado");
        if (tk.t === "num" || tk.t === "cte" || tk.t === "var") { pos++; return; }
        if (tk.t === "fn") {
          pos++;
          if (!(mirar() && mirar().t === "pa" && mirar().v === "(")) throw new Error(tk.v + "(…) necesita paréntesis — ej: " + tk.v + "(x)");
          pos++; expr();
          if (!(mirar() && mirar().t === "pa" && mirar().v === ")")) throw new Error("falta cerrar el paréntesis de " + tk.v + "(…");
          pos++; return;
        }
        if (tk.t === "pa" && tk.v === "(") {
          pos++; expr();
          if (!(mirar() && mirar().t === "pa" && mirar().v === ")")) throw new Error("falta cerrar un paréntesis");
          pos++; return;
        }
        if (tk.t === "barra") {
          pos++; expr();
          if (!(mirar() && mirar().t === "barra")) throw new Error("falta la segunda barra |…|");
          pos++; return;
        }
        if (tk.t === "comp") throw new Error("un comparador («" + tk.v + "») solo va en las ÁREAS (region), no en una ecuación");
        if (tk.t === "igual") throw new Error("una ecuación solo puede llevar UN signo «=»");
        throw new Error("no espero «" + (tk.v ?? "|") + "» ahí");
      }
      expr();
      if (pos < toks.length) throw new Error("sobran símbolos al final (revisa la expresión)");
    }
  
    /* null = se entiende · texto = el problema (para marcar en rojo).
       La ecuación se parte en su signo «=» y CADA lado se revisa solo
       (igual que hace el motor del visual). */
    function errorDeExpresion(texto, conComparador) {
      let t = String(texto ?? "").toLowerCase().trim();
      t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (const [re, s] of [[/²/g, "^2"], [/³/g, "^3"], [/⁴/g, "^4"], [/⁵/g, "^5"],
        [/√/g, "sqrt"], [/π/g, "pi"], [/×|·/g, "*"], [/÷/g, "/"],
        [/−|–|—/g, "-"], [/≥/g, ">="], [/≤/g, "<="]]) t = t.replace(re, s);
      t = t.replace(/(\d)\s*,\s*(\d)/g, "$1.$2");
      if (!t) return "está vacía";
      const partes = t.split("=");
      if (partes.length > 2) return "lleva más de un signo «=»";
      for (const lado of partes) {
        const mal = revisarLado(lado, conComparador);
        if (mal) return mal;
      }
      return null;
    }
  
    function revisarLado(lado, conComparador) {
      try {
        const toks = tokenizarCompacto(lado);
        if (!toks.length) return "hay un lado vacío (revisa el signo «=»)";
        const idx = toks.findIndex((tk) => tk.t === "comp");
        if (idx >= 0 && !conComparador) {
          return "lleva un comparador («" + toks[idx].v + "»): las desigualdades van en las ÁREAS, no aquí";
        }
        if (idx >= 0) {
          revisarCadena(toks.slice(0, idx));
          revisarCadena(toks.slice(idx + 1));
          return null;
        }
        revisarCadena(toks);
        return null;
      } catch (e) {
        return e.message;
      }
    }
  
    /* ¿Trae x o y de verdad? (acotaciones, rangos y coordenadas no pueden) */
    function traeVariables(texto) {
      try {
        return tokenizarCompacto(texto).some((tk) => tk.t === "var");
      } catch (_) {
        return false;
      }
    }
  
    /* Colores: mismo criterio del visual (hex 3/4/6/8 o nombre) */
    const NOMBRES_COLOR = ["negro", "blanco", "gris", "rojo", "vino", "rosa", "fucsia",
      "naranja", "amarillo", "lima", "verde", "turquesa", "cian", "celeste", "azul",
      "morado", "violeta", "cafe", "marron"];
    function colorOK(t) {
      const s = String(t ?? "").toLowerCase().trim();
      if (!s) return false;
      if (NOMBRES_COLOR.includes(s)) return true;
      return /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s);
    }
  
    /* ── lectura de líneas «a | b | c» cuando el contenido puede llevar
          barras de valor absoluto (y=|x|): color y acotaciones se toman
          del FINAL y la ecuación se queda con todo lo demás (IGUAL que
          el visual) ── */
    const esSegAcot = (s) => /^\s*[xy]\s*:.+$/i.test(s);
    const esSegRango = (s) => /^([xy])\s*=\s*.+\.\..+$/.test(s);
    const esSegRecorte = (s) => /^recorte(\s*:|\s|$)/i.test(
      String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
    function quitaColor(segs) {
      if (segs.length < 2) return "";
      const ultimo = segs[segs.length - 1];
      if (colorOK(ultimo)) return segs.pop();
      return "";
    }
    /* { ecuacion, color, acot, rec, colorMalo } — colorMalo = había una
       ecuación completa seguida de un segmento que NO es color válido.
       Los segmentos se leen del FINAL: recorte → acotaciones → color. */
    function partirFuncion(lin) {
      const segs = lin.split("|").map((s) => s.trim());
      const out = { ecuacion: "", color: "", acot: "", rec: undefined, colorMalo: "" };
      if (segs.length >= 2 && esSegRecorte(segs[segs.length - 1])) {
        out.rec = segs.pop().replace(/^recorte\s*:?/i, "").trim();
      }
      if (segs.length >= 2 && esSegAcot(segs[segs.length - 1])) out.acot = segs.pop();
      out.color = quitaColor(segs);
      if (segs.length === 2) {
        const mal = errorDeExpresion(segs[0], false);
        if (!mal) out.colorMalo = segs[1];
      }
      out.ecuacion = segs.join("|").trim();
      return out;
    }
  
    /* Rango «x=de..a» (áreas «entre» y «region») */
    function errorDeRango(texto, donde) {
      const m = String(texto ?? "").trim().match(/^([xy])\s*=\s*(.+?)\.\.(.+)$/);
      if (!m) return donde + ": el rango se escribe «x=de..a» — ej: x=0..4 (llegó «" + texto + "»)";
      for (const lado of [m[2], m[3]]) {
        const mal = errorDeExpresion(lado, false);
        if (mal) return donde + ": no entiendo «" + lado + "» en el rango — " + mal;
        if (traeVariables(lado)) return donde + ": el rango no puede llevar x ni y — usa números (ej: x=0..4 o x=0..2pi)";
      }
      return null;
    }
  
    /* RECORTE «x:a,b; y:c,d»: DOS valores por eje, sin variables y
       sin repetir el mismo valor (el ancho cero no dibuja nada; si
       llegan al revés el visual los acomoda solos). Espejo del
       parsearRecorte del visual. */
    const esNumPlano = (s) => /^[+-]?(\d+\.?\d*|\.\d+)$/.test(String(s).trim());
    function errorDeRecorte(texto, donde) {
      const t = String(texto ?? "").trim();
      if (!t) {
        return donde + ": el recorte está vacío — escribe «x:a,b» y/o «y:c,d» (mínimo y máximo de la porción), ej: x:0,4; y:2,8";
      }
      let vistos = "";
      for (const seg of t.split(";").map((s) => s.trim()).filter(Boolean)) {
        const m = seg.match(/^([xy])\s*:\s*(.+)$/i);
        if (!m) {
          return donde + ": el recorte «" + seg + "» no se entiende — usa «x:a,b» y/o «y:c,d» (mínimo y máximo), ej: x:0,4; y:2,8";
        }
        const eje = m[1].toLowerCase();
        if (vistos.includes(eje)) return donde + " repite el recorte de " + eje;
        vistos += eje;
        const vals = m[2].split(",").map((s) => s.trim()).filter(Boolean);
        if (vals.length !== 2) {
          return donde + ": el recorte de " + eje + " necesita DOS valores (mínimo y máximo) — ej: " + eje + ":0,4";
        }
        for (const val of vals) {
          const mal = errorDeExpresion(val, false);
          if (mal) return donde + ": no entiendo «" + val + "» en el recorte — " + mal;
          if (traeVariables(val)) {
            return donde + ": el recorte de " + eje + " no puede llevar x ni y — escribe números (ej: " + eje + ":0,4 o " + eje + ":0,2pi)";
          }
        }
        if (vals[0] === vals[1] ||
            (esNumPlano(vals[0]) && esNumPlano(vals[1]) && Number(vals[0]) === Number(vals[1]))) {
          return donde + ": el recorte de " + eje + " repite el mismo valor — necesita el mínimo y el máximo distintos, ej: " + eje + ":0,4";
        }
      }
      return null;
    }
  
    /* ── A PRUEBA DE ERRORES: TODO lo que el visual exige ── */
    function validarGraficador(v) {
      const errs = [];
  
      /* escala: obligatoria, > 0, y que no explote la cuadrícula */
      const escala = num(v.escala);
      if (escala === undefined) {
        errs.push({ k: "escala", msg: "«Escala de la cuadrícula» es obligatorio y debe ser un número mayor que 0 — ej: 1" });
      } else if (!(escala > 0)) {
        errs.push({ k: "escala", msg: "La escala debe ser MAYOR que 0 — ej: 1 · 2 · 0.5" });
      } else {
        const ax0 = num(v.rangoXmin), ax1 = num(v.rangoXmax);
        const ay0 = num(v.rangoYmin), ay1 = num(v.rangoYmax);
        const anchoX = ax0 !== undefined && ax1 !== undefined && ax1 > ax0 ? ax1 - ax0 : 40;
        const altoY = ay0 !== undefined && ay1 !== undefined && ay1 > ay0 ? ay1 - ay0 : 40;
        if (anchoX / escala > 160 || altoY / escala > 160) {
          errs.push({ k: "escala", msg: "Con esa escala salen más de 160 líneas de cuadrícula — usa una escala mayor (ej: 2, 5 o 10) o un rango menor." });
        }
      }
  
      /* rangos: si escribes los DOS, mín < máx */
      const rx0 = num(v.rangoXmin), rx1 = num(v.rangoXmax);
      const ry0 = num(v.rangoYmin), ry1 = num(v.rangoYmax);
      if (rx0 !== undefined && rx1 !== undefined && !(rx1 > rx0)) {
        errs.push({ k: "rangoXmax", msg: "El máximo de X debe ser MAYOR que el mínimo (escribiste " + rx0 + " y " + rx1 + ")." });
      }
      if (ry0 !== undefined && ry1 !== undefined && !(ry1 > ry0)) {
        errs.push({ k: "rangoYmax", msg: "El máximo de Y debe ser MAYOR que el mínimo (escribiste " + ry0 + " y " + ry1 + ")." });
      }
  
      /* cuadrantes: solo 1, 2, 3, 4 */
      const cTxt = limpia(v.cuadrantes);
      if (cTxt) {
        const partes = cTxt.split(",").map((s) => s.trim()).filter(Boolean);
        if (!partes.length || partes.some((p) => !/^[1-4]$/.test(p))) {
          errs.push({ k: "cuadrantes", msg: "«Cuadrantes» solo acepta 1, 2, 3 y 4 separados por comas — ej: 1,2,3,4 (vacío = los cuatro)." });
        }
      }
  
      /* funciones: ecuación interpretable + color + recorte + acotaciones */
      lineasDe(v.funciones).forEach((lin, i) => {
        const n = " (línea " + (i + 1) + ")";
        const p = partirFuncion(lin);
        if (p.colorMalo) {
          errs.push({ k: "funciones", msg: "Color no válido" + n + ": «" + p.colorMalo + "» — usa hex (#e74c3c) o nombre (rojo, azul, verde, negro, morado, celeste…)." });
          return;
        }
        const ec = p.ecuacion;
        if (!ec) {
          errs.push({ k: "funciones", msg: "Hay una línea sin ecuación — ej: y = x^2 | rojo | x:-2,5" });
          return;
        }
        const mal = errorDeExpresion(ec, false);
        if (mal) {
          errs.push({ k: "funciones", msg: "No entiendo la ecuación" + n + ": «" + ec + "» — " + mal + ". Ejemplos: y = x^2 · y=(x-2)^2+1 · x=y^2-4 · x^2+y^2=9" });
          return;
        }
        if (p.color && !colorOK(p.color)) {
          errs.push({ k: "funciones", msg: "Color no válido" + n + ": «" + p.color + "» — usa hex (#e74c3c) o nombre (rojo, azul, verde, negro, morado, celeste…)." });
        }
        if (p.rec !== undefined) {
          const malRec = errorDeRecorte(p.rec, "El recorte de la función" + n);
          if (malRec) errs.push({ k: "funciones", msg: malRec });
        }
        if (p.acot) {
          String(p.acot).split(";").map((s) => s.trim()).filter(Boolean).forEach((seg) => {
            const m = seg.match(/^([xy])\s*:\s*(.+)$/i);
            if (!m) {
              errs.push({ k: "funciones", msg: "Acotaciones" + n + ": «" + seg + "» no se entiende — usa «x:a,b» o «y:c» (límites o asíntotas), ej: x:-2,5; y:3" });
              return;
            }
            const vals = m[2].split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2);
            if (!vals.length) {
              errs.push({ k: "funciones", msg: "Acotaciones" + n + ": «" + seg + "» no tiene valor — ej: y:3" });
              return;
            }
            for (const val of vals) {
              const malV = errorDeExpresion(val, false);
              if (malV) {
                errs.push({ k: "funciones", msg: "Acotaciones" + n + ": no entiendo «" + val + "» — " + malV });
              } else if (traeVariables(val)) {
                errs.push({ k: "funciones", msg: "Acotaciones" + n + ": «" + val + "» no puede llevar x ni y — escribe un número (ej: pi/2, -3)" });
              }
            }
          });
        }
      });
  
      /* áreas: «entre | curvas | x=de..a | color» o «region | def | color» */
      lineasDe(v.areas).forEach((lin, i) => {
        const n = " (línea " + (i + 1) + ")";
        const partes = lin.split("|").map((s) => s.trim());
        const tipo = partes[0].toLowerCase();
        if (tipo !== "entre" && tipo !== "region") {
          errs.push({ k: "areas", msg: "El área" + n + " debe empezar con «entre» o «region» — ej: entre | y=x^2 ; y=0 | x=0..4 | #2563eb44" });
          return;
        }
        const color = quitaColor(partes);
        if (tipo === "entre") {
          let rango = "";
          if (partes.length >= 3 && esSegRango(partes[partes.length - 1])) rango = partes.pop();
          const curvas = partes.slice(1).join("|").split(";").map((s) => s.trim()).filter(Boolean);
          if (!curvas.length) { errs.push({ k: "areas", msg: "El área" + n + " (entre) necesita las curvas — ej: y=x^2 ; y=0" }); return; }
          if (curvas.length > 2) { errs.push({ k: "areas", msg: "El área" + n + " admite máximo 2 curvas separadas por «;»" }); return; }
          for (const c of curvas) {
            const mal = errorDeExpresion(c, false);
            if (mal) { errs.push({ k: "areas", msg: "El área" + n + ": no entiendo «" + c + "» — " + mal }); continue; }
            if (!/^y\s*=/.test(c)) {
              errs.push({ k: "areas", msg: "El área" + n + ": para «entre» las curvas van despejadas en y — ej: y=x^2 (llegó «" + c + "»)" });
            }
          }
          if (rango) {
            const malR = errorDeRango(rango, "El área" + n);
            if (malR) errs.push({ k: "areas", msg: malR });
          }
          if (color && !colorOK(color)) {
            errs.push({ k: "areas", msg: "Color no válido" + n + ": «" + color + "» — usa hex (#2563eb44) o nombre (azul, verde…)." });
          }
        } else {
          if (partes.length < 2) { errs.push({ k: "areas", msg: "El área" + n + " (region) necesita una desigualdad (y >= x^2) o un rango (x=-2..2)" }); return; }
          let def = partes.slice(1).join("|").trim();
          if (/^(no|!)\s+/.test(def)) def = def.replace(/^(no|!)\s+/, "");
          if (/[<>]/.test(def)) {
            const m = def.match(/^(.*?)(>=|<=|>|<)(.*)$/);
            if (!m || !m[1].trim() || !m[3].trim()) {
              errs.push({ k: "areas", msg: "El área" + n + ": desigualdad incompleta — ej: y >= x^2" });
            } else {
              for (const lado of [m[1], m[3]]) {
                const mal = errorDeExpresion(lado, false);
                if (mal) { errs.push({ k: "areas", msg: "El área" + n + ": no entiendo «" + lado.trim() + "» — " + mal }); }
              }
            }
          } else if (/=/.test(def) && !/\.\./.test(def)) {
            errs.push({ k: "areas", msg: "El área" + n + ": en «region» la igualdad no se colorea — usa una desigualdad (>=, >, <=, <) o un rango (x=a..b)" });
          } else {
            const rangos = def.split(",").map((s) => s.trim()).filter(Boolean);
            if (!rangos.length) {
              errs.push({ k: "areas", msg: "El área" + n + " (region) necesita una desigualdad (y >= x^2) o un rango (x=-2..2)" });
            } else {
              for (const r of rangos) {
                const malR = errorDeRango(r, "El área" + n);
                if (malR) errs.push({ k: "areas", msg: malR });
              }
            }
          }
          if (color && !colorOK(color)) {
            errs.push({ k: "areas", msg: "Color no válido" + n + ": «" + color + "» — usa hex (#2563eb44) o nombre (azul, verde…)." });
          }
        }
      });
  
      /* puntos: «A(x,y) | color» con coordenadas numéricas */
      lineasDe(v.puntos).forEach((lin, i) => {
        const n = " (línea " + (i + 1) + ")";
        const partes = lin.split("|").map((s) => s.trim());
        const color = quitaColor(partes);
        const m = partes.join("|").match(/^([A-Za-z])\s*\(\s*(.+?)\s*[;,]\s*(.+?)\s*\)$/);
        if (!m) {
          errs.push({ k: "puntos", msg: "El punto" + n + " no se entiende — formato: A(2,3) | color (UNA letra y las coordenadas x,y)" });
          return;
        }
        for (const coord of [m[2], m[3]]) {
          const mal = errorDeExpresion(coord, false);
          if (mal) {
            errs.push({ k: "puntos", msg: "El punto" + n + ": no entiendo la coordenada «" + coord + "» — " + mal });
          } else if (traeVariables(coord)) {
            errs.push({ k: "puntos", msg: "El punto" + n + ": la coordenada «" + coord + "» no puede llevar x ni y — escribe un número (ej: pi/2, -3, 1/4)" });
          }
        }
        if (color && !colorOK(color)) {
          errs.push({ k: "puntos", msg: "Color no válido" + n + ": «" + color + "» — usa hex (#8e44ad) o nombre (morado, rojo…)." });
        }
      });
  
      /* ancho razonable */
      const ancho = num(v.ancho);
      if (ancho !== undefined && !(ancho >= 200 && ancho <= 1000)) {
        errs.push({ k: "ancho", msg: "El ancho debe estar entre 200 y 1000 px — ej: 560" });
      }
      return errs;
    }
  
    /* ══ Entrada del REGISTRO (se reemplaza sola si ya existía) ══ */
    const entrada = {
      id: "graficador-funciones-cartesianas",
      nombre: "Plano cartesiano de funciones",
      cat: "visuales",
      archivo: "recursos/js/visuales/graficador-funciones-cartesianas.js",
      imports: ["dibujarGraficadorCartesiano"],
      funcion: "dibujarGraficadorCartesiano",
      descripcion: "Plano con cuadrícula según escala: funciones en cualquier formato (explícitas, canónicas, cónicas e implícitas), áreas de dominio/entre curvas, puntos con letra, límites punteados y RECORTES de porción por valores de x/y.",
      params: [
        { k: "rangoXmin", et: "Eje X: mínimo (vacío = -20)", tipo: "num", ej: "-6" },
        { k: "rangoXmax", et: "Eje X: máximo (vacío = 20)", tipo: "num", ej: "8" },
        { k: "rangoYmin", et: "Eje Y: mínimo (vacío = -20)", tipo: "num", ej: "-4" },
        { k: "rangoYmax", et: "Eje Y: máximo (vacío = 20)", tipo: "num", ej: "10" },
        { k: "escala", et: "Escala de la cuadrícula", tipo: "num", req: true, ej: "1 · 2 · 0.5" },
        { k: "cuadrantes", et: "Cuadrantes a mostrar (vacío = los 4)", tipo: "texto", ej: "1,2,3,4" },
        { k: "funciones", et: "Funciones / ecuaciones — una por línea: ecuación | color | acotaciones | recorte", tipo: "lineas",
          ej: "y = x^2 | rojo | x:-2,5; y:3 | recorte x:-2,5\ny = (x-2)^2+1 | azul\nx^2+y^2=9 | verde | recorte x:-3,3; y:0,3\nx=y^2-4" },
        { k: "areas", et: "Áreas a colorear — una por línea", tipo: "lineas",
          ej: "entre | y=x^2 ; y=4-x | x=0..4 | #2563eb44\nregion | y >= x^2 | #dc262633\nregion | x=0..4 | #16a34a33  (dominio)\nregion | no y > 0 | #94a3b822  (no dominio)" },
        { k: "puntos", et: "Puntos — una por línea: Letra(x,y) | color", tipo: "lineas",
          ej: "A(2,3) | #8e44ad\nB(-1,0.5)\nV(2,1) | morado" },
        { k: "etiquetas", et: "Etiquetar cada gráfica con su ecuación", tipo: "sino", def: true },
        { k: "ancho", et: "Ancho del plano (px)", tipo: "num", def: 560, ej: "560" },
      ],
      aOpciones: (v) => ({
        rango: {
          xMin: num(v.rangoXmin),
          xMax: num(v.rangoXmax),
          yMin: num(v.rangoYmin),
          yMax: num(v.rangoYmax),
        },
        escala: num(v.escala),
        cuadrantes: listaCuadrantes(v.cuadrantes),
        funciones: lineasDe(v.funciones),
        areas: lineasDe(v.areas),
        puntos: lineasDe(v.puntos),
        etiquetas: bool(v.etiquetas, true),
        ancho: num(v.ancho),
      }),
      /* ── A PRUEBA DE ERRORES: revisor espejo del motor del visual ── */
      validar: validarGraficador,
    };
    /* Reemplaza o agrega: si ya está pegado el BLOQUE 35 viejo, esta
       versión ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
    const i = REGISTRO.findIndex((r) => r.id === "graficador-funciones-cartesianas");
    if (i >= 0) REGISTRO[i] = entrada;
    else REGISTRO.push(entrada);
  })();
  /* ═══════════════ fin BLOQUE 35 · «graficador-funciones-cartesianas» ═══════════════ */
/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 36 · «tarjetaElementoQuimico» — Tarjeta química del elemento
   [visuales] · v1.1 (masa aproximada con DOS decimales)
   Visual: recursos/js/visuales/ciencias/tarjetaElementoQuimico.js
   (HTML/CSS nativos, cero librerías, cero eventos: un CUADRADO PERFECTO
   con número atómico, símbolo, nombre en los dos idiomas, masa atómica
   exacta y APROXIMADA con DOS decimales, protones-electrones-neutrones,
   periodo, grupo, bloque s/p/d/f, familia, estados de oxidación y
   configuración completa y reducida. La GAMA DE COLOR de bordes y
   acentos se adapta sola a la categoría: alcalinos rojo intenso,
   alcalinotérreos naranja claro, transición amarillo/gris, lantánidos
   marrón, actínidos violeta, otros metales verde azulado, metaloides
   oliva, no metales azul claro, halógenos morado, gases nobles
   rosa/magenta. Sin contenedor se muestra centrada en el <body>.)
   Obligatorio: AL MENOS UN dato bien escrito — con uno que llegue
   correcto, los otros quedan opcionales:
     · Número atómico: entero 1–118.
     · Símbolo: SENSIBLE a mayúsculas («Na» sí; «na» NO — el revisor
       lo detecta y sugiere la grafía correcta).
     · Nombre: español o inglés, SIN importar mayúsculas ni acentos
       («sodio», «SODIO», «sodium», «Oxígeno»… — el revisor coteja
       contra la lista de los 118 nombres en los DOS idiomas).
   Idioma de la tarjeta: «español» o «english» (lista fija).
   La PUERTA DE GUARDADO usa validar() de aquí abajo.
   Si ya pegaste este BLOQUE 36 antes, este lo REEMPLAZA solo (mismo
   id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  /* ── Ayudantes SOLO de este bloque (no tocan nada del crear.js base) ── */
  const limpia = (v) => String(v ?? "").trim();

  /* Los 118 símbolos VÁLIDOS en orden (H → Og): sirven para revisar
     AQUÍ MISMO el símbolo — SENSIBLE a mayúsculas — sin cargar el visual. */
  const SIMBOLOS = (
    "H He Li Be B C N O F Ne " +
    "Na Mg Al Si P S Cl Ar K Ca " +
    "Sc Ti V Cr Mn Fe Co Ni Cu Zn " +
    "Ga Ge As Se Br Kr Rb Sr Y Zr " +
    "Nb Mo Tc Ru Rh Pd Ag Cd In Sn " +
    "Sb Te I Xe Cs Ba La Ce Pr Nd " +
    "Pm Sm Eu Gd Tb Dy Ho Er Tm Yb " +
    "Lu Hf Ta W Re Os Ir Pt Au Hg " +
    "Tl Pb Bi Po At Rn Fr Ra Ac Th " +
    "Pa U Np Pu Am Cm Bk Cf Es Fm " +
    "Md No Lr Rf Db Sg Bh Hs Mt Ds " +
    "Rg Cn Nh Fl Mc Lv Ts Og"
  ).split(" ");

  /* Los 118 nombres en ESPAÑOL y en INGLÉS, en el mismo orden: el
     revisor coteja el nombre SIN importar mayúsculas ni acentos. */
  const NOMBRES_ES = (
    "Hidrógeno Helio Litio Berilio Boro Carbono Nitrógeno Oxígeno Flúor Neón " +
    "Sodio Magnesio Aluminio Silicio Fósforo Azufre Cloro Argón Potasio Calcio " +
    "Escandio Titanio Vanadio Cromo Manganeso Hierro Cobalto Níquel Cobre Zinc " +
    "Galio Germanio Arsénico Selenio Bromo Kriptón Rubidio Estroncio Itrio Circonio " +
    "Niobio Molibdeno Tecnecio Rutenio Rodio Paladio Plata Cadmio Indio Estaño " +
    "Antimonio Telurio Yodo Xenón Cesio Bario Lantano Cerio Praseodimio Neodimio " +
    "Prometio Samario Europio Gadolinio Terbio Disprosio Holmio Erbio Tulio Iterbio " +
    "Lutecio Hafnio Tantalio Wolframio Renio Osmio Iridio Platino Oro Mercurio " +
    "Talio Plomo Bismuto Polonio Astato Radón Francio Radio Actinio Torio " +
    "Protactinio Uranio Neptunio Plutonio Americio Curio Berkelio Californio Einstenio Fermio " +
    "Mendelevio Nobelio Lawrencio Rutherfordio Dubnio Seaborgio Bohrio Hasio Meitnerio Darmstatio " +
    "Roentgenio Copernicio Nihonio Flerovio Moscovio Livermorio Teneso Oganesón"
  );
  const NOMBRES_EN = (
    "Hydrogen Helium Lithium Beryllium Boron Carbon Nitrogen Oxygen Fluorine Neon " +
    "Sodium Magnesium Aluminum Silicon Phosphorus Sulfur Chlorine Argon Potassium Calcium " +
    "Scandium Titanium Vanadium Chromium Manganese Iron Cobalt Nickel Copper Zinc " +
    "Gallium Germanium Arsenic Selenium Bromine Krypton Rubidium Strontium Yttrium Zirconium " +
    "Niobium Molybdenum Technetium Ruthenium Rhodium Palladium Silver Cadmium Indium Tin " +
    "Antimony Tellurium Iodine Xenon Cesium Barium Lanthanum Cerium Praseodymium Neodymium " +
    "Promethium Samarium Europium Gadolinium Terbium Dysprosium Holmium Erbium Thulium Ytterbium " +
    "Lutetium Hafnium Tantalum Tungsten Rhenium Osmium Iridium Platinum Gold Mercury " +
    "Thallium Lead Bismuth Polonium Astatine Radon Francium Radium Actinium Thorium " +
    "Protactinium Uranium Neptunium Plutonium Americium Curium Berkelium Californium Einsteinium Fermium " +
    "Mendelevium Nobelium Lawrencium Rutherfordium Dubnium Seaborgium Bohrium Hassium Meitnerium Darmstadtium " +
    "Roentgenium Copernicium Nihonium Flerovium Moscovium Livermorium Tennessine Oganesson"
  );
  const sinAcentos = (s) =>
    String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const NOMBRES = new Set((NOMBRES_ES + " " + NOMBRES_EN).split(" ").map(sinAcentos).filter(Boolean));

  /* ── A PRUEBA DE ERRORES: la regla de ESTE bloque ──
     · AL MENOS UN dato (número, símbolo o nombre) — si uno llega bien
       escrito, los otros quedan opcionales;
     · número: entero 1–118;
     · símbolo: contra los 118 símbolos EXACTOS (distingue mayúsculas,
       y si estaba bien pero mal escrito en mayúsculas, sugiere «Na»);
     · nombre: letras + contra los 118 nombres ES y EN sin acentos. */
  function validarTarjeta(v) {
    const errs = [];
    const num = limpia(v.numeroAtomico);
    const sim = limpia(v.simbolo);
    const nom = limpia(v.nombre);

    if (!num && !sim && !nom) {
      const msg = "Escribe AL MENOS UN dato del elemento: número atómico (1–118), símbolo («Na») o nombre («sodio» / «sodium»). Con uno bien escrito, los otros quedan opcionales.";
      errs.push({ k: "numeroAtomico", msg });
      errs.push({ k: "simbolo", msg: " " });
      errs.push({ k: "nombre", msg: " " });
      return errs;
    }

    if (num) {
      const n = Number(num);
      if (!/^\d+$/.test(num) || !Number.isInteger(n) || n < 1 || n > 118) {
        errs.push({ k: "numeroAtomico", msg: "«Número atómico» debe ser un ENTERO entre 1 y 118 (llegó «" + num + "»), ej: 11 para el sodio." });
      }
    }

    if (sim) {
      if (!SIMBOLOS.includes(sim)) {
        const casi = SIMBOLOS.find((s) => s.toLowerCase() === sim.toLowerCase());
        errs.push({ k: "simbolo", msg: casi
          ? "El símbolo SÍ distingue mayúsculas: escribiste «" + sim + "» pero el correcto es «" + casi + "»."
          : "«" + sim + "» no es el símbolo de ningún elemento (los 118 van del H al Og). Revisa la grafía exacta, ej: Na · Cl · Fe." });
      }
    }

    if (nom) {
      if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+([ -][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/.test(nom)) {
        errs.push({ k: "nombre", msg: "«Nombre» solo acepta letras (español o inglés), ej: «sodio», «sodium», «Oxígeno» — si querías buscar por número, usa el campo «Número atómico»." });
      } else if (!NOMBRES.has(sinAcentos(nom))) {
        errs.push({ k: "nombre", msg: "No reconozco el nombre «" + nom + "». Escribe el nombre del elemento en ESPAÑOL o INGLÉS (sin importar mayúsculas ni acentos), ej: «sodio» o «sodium»." });
      }
    }

    return errs;
  }

  /* ══ Entrada del REGISTRO (se reemplaza sola si ya existía) ══ */
  const entrada = {
    id: "tarjetaElementoQuimico",
    nombre: "Tarjeta química del elemento",
    cat: "visuales",
    archivo: "recursos/js/visuales/ciencias/tarjetaElementoQuimico.js",
    imports: ["mostrarTarjetaElemento"],
    funcion: "mostrarTarjetaElemento",
    descripcion: "Tarjeta CUADRADA con todo sobre un elemento: masa exacta y aproximada (2 decimales), protones-electrones-neutrones, periodo, grupo, bloque, familia, oxidaciones y configuraciones completa/reducida. Se busca por número atómico, símbolo o nombre (español o inglés) — con UN dato bien escrito alcanza; los colores se adaptan a la categoría.",
    params: [
      { k: "numeroAtomico", et: "Número atómico (1–118) — opcional si escribes símbolo o nombre", tipo: "num", ej: "11" },
      { k: "simbolo", et: "Símbolo químico — SENSIBLE a mayúsculas — opcional", tipo: "texto", ej: "Na · Cl · Fe" },
      { k: "nombre", et: "Nombre en español o inglés — sin importar mayúsculas ni acentos — opcional", tipo: "texto", ej: "sodio · sodium · Oxígeno" },
      { k: "idioma", et: "Idioma de la tarjeta", tipo: "opcion", ops: ["español", "english"], def: "español" },
    ],
    aOpciones: (v) => ({
      numeroAtomico: num(v.numeroAtomico),
      simbolo: limpia(v.simbolo) || undefined,
      nombre: limpia(v.nombre) || undefined,
      idioma: v.idioma || "español",
    }),
    aCodigo: (v) => ({
      numeroAtomico: num(v.numeroAtomico),
      simbolo: limpia(v.simbolo) || undefined,
      nombre: limpia(v.nombre) || undefined,
      idioma: v.idioma || "español",
    }),
    /* ── A PRUEBA DE ERRORES: revisor espejo del visual ── */
    validar: validarTarjeta,
  };
  /* Reemplaza o agrega: si ya está pegado este BLOQUE 36, esta versión
     ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
  const i = REGISTRO.findIndex((r) => r.id === "tarjetaElementoQuimico");
  if (i >= 0) REGISTRO[i] = entrada;
  else REGISTRO.push(entrada);
})();
/* ═════════════════ fin BLOQUE 36 · «tarjetaElementoQuimico» ═══════════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 37 · «tablaPeriodica» — Tabla periódica interactiva   [utils]
   Util: js/utils/ciencias/tablaPeriodica.js
   Tabla COMPLETA de los 118 elementos: 18 grupos y 7 periodos
   numerados, metales de transición en su sitio y las series internas
   (lantánidos y actínidos) en las DOS filas de abajo, cada familia
   con SU color (la misma gama de la tarjeta química) y leyenda.
   Cada celda muestra SOLO: número atómico, peso atómico completo
   (los sintéticos entre paréntesis), símbolo y nombre. AL PULSAR un
   elemento se abre un MODAL (✕ · Esc · clic en el fondo) con la
   TARJETA QUÍMICA de ese elemento (la del visual
   recursos/js/visuales/ciencias/tarjetaElementoQuimico.js: masa
   exacta y aproximada con 2 decimales, protones-electrones-
   neutrones, periodo, grupo, bloque s/p/d/f, familia, oxidaciones y
   configuraciones completa/reducida); si ese visual no estuviera,
   el modal muestra una ficha básica con los datos de la tabla.
   Obligatorio: NADA — la tabla se muestra completa sola; solo se
   elige el idioma (la tarjeta de cada elemento sale en ese idioma).
   Escala sola con el ancho del contenedor (container queries), así
   que cabe en una lámina de clase o en el celular sin deformarse.
   La PUERTA DE GUARDADO no necesita validar() aquí: no hay campos
   que puedan quedar vacíos (el idioma es una lista fija).
   Si ya pegaste este BLOQUE 37 antes, este lo REEMPLAZA solo (mismo
   id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  const entrada = {
    id: "tablaPeriodica",
    nombre: "tablaPeriodica — Tabla periódica",
    cat: "utils",
    archivo: "utils/ciencias/tablaPeriodica.js",
    imports: ["tablaPeriodica"],
    funcion: "tablaPeriodica",
    descripcion: "Tabla periódica completa con colores por familia (18 grupos, 7 periodos, transición, lantánidos y actínidos): número atómico, peso atómico, símbolo y nombre por elemento; al pulsar uno se abre su tarjeta química en un modal.",
    params: [
      { k: "idioma", et: "Idioma de la tabla y de las tarjetas", tipo: "opcion", ops: ["español", "english"], def: "español" },
    ],
    aOpciones: (v) => ({
      idioma: v.idioma || "español",
    }),
    aCodigo: (v) => ({
      idioma: v.idioma || "español",
    }),
  };
  /* Reemplaza o agrega: si ya está pegado este BLOQUE 37, esta versión
     ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
  const i = REGISTRO.findIndex((r) => r.id === "tablaPeriodica");
  if (i >= 0) REGISTRO[i] = entrada;
  else REGISTRO.push(entrada);
})();
/* ═════════════════ fin BLOQUE 37 · «tablaPeriodica» ═════════════════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 38 · «calculadoraCientifica» — Calculadora científica FX  [utils]
   Util: js/utils/ciencias/calculadoraCientifica.js
   Calculadora científica INTERACTIVA que emula una física tipo FX-991:
   carcasa oscura mate con pad direccional, LCD de dos filas (expresión
   en matriz de puntos con indicadores S·A·hyp·M·STO·RCL y modo
   DEG/RAD/GRA + resultado en dígitos de 7 segmentos), capas SHIFT
   (amarillo) y ALPHA (magenta) funcionales, paréntesis, potencias y
   raíces, fracciones a b/c con S⇔D, trigonometría con inversas e
   hiperbólicas, log/ln/log□, π y e, factorial, Ans, variables A…F X Y
   M con STO/RCL, M+/M−, ENG, °′″, CALC, integral ∫dx y d/dx con X,
   historial ▲▼, cursor ◀▶, menú CONFIG (modo angular) y OFF.
   RESTRICCIÓN PEDAGÓGICA: el campo «funcionesDeshabilitadas» apaga
   teclas o funciones concretas («sin», «SHIFT:sin», «ALPHA:D»,
   «integral», «log», «x!»…): se ven grises, sin hover ni clic, la
   serigrafía de la capa bloqueada se atenúa y TAMBIÉN se bloquea la
   entrada desde el teclado físico de la computadora.
   Obligatorio: NADA — sin configurar sale completa y habilitada.
   La PUERTA DE GUARDADO valida con validarCalculadora() que cada
   nombre de la lista se reconozca (evita bloqueos mal escritos que
   después no bloquearían nada).
   Si ya pegaste este BLOQUE 38 antes, este lo REEMPLAZA solo (mismo
   id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  const limpiaLista = (s) =>
    String(s == null ? "" : s)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  /* ── A PRUEBA DE ERRORES: espejo del reconocedor del util ──
     Cada nombre debe ser una tecla o función real (con sus alias:
     sin⁻¹, sinh, 10^x, e^x, π, x!, ∛, d/dx, M−, STO, OFF, sen, ^, =…)
     para que un bloqueo mal escrito no pase inadvertido. */
  const IDS = new Set([
    "shift", "alpha", "mode", "on", "calc", "integral", "inv", "logbase", "sqr",
    "sqrt", "cube", "pow", "log", "ln", "neg", "dms", "hyp", "sin", "cos", "tan",
    "rcl", "eng", "lpar", "rpar", "sd", "mplus", "del", "ac", "add", "sub", "mul",
    "div", "eq", "dot", "exp", "ans", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  ]);
  const LETRAS = { A: "neg", B: "dms", C: "hyp", D: "sin", E: "cos", F: "tan", X: "rpar", Y: "sd", M: "mplus" };
  const ALIAS = {
    "sin⁻¹": 1, "sin-1": 1, asin: 1, arcsin: 1, asen: 1, arcosen: 1, "sen⁻¹": 1,
    "cos⁻¹": 1, "cos-1": 1, acos: 1, arccos: 1,
    "tan⁻¹": 1, "tan-1": 1, atan: 1, arctan: 1, atg: 1, "tg⁻¹": 1,
    sinh: 1, senh: 1, cosh: 1, tanh: 1, tgh: 1,
    "sinh⁻¹": 1, asinh: 1, "cosh⁻¹": 1, acosh: 1, "tanh⁻¹": 1, atanh: 1,
    "x!": 1, factorial: 1, "∛": 1, raizcubica: 1, "raízcubica": 1, "raízcúbica": 1,
    "10^x": 1, "10ˣ": 1, "10x": 1, "e^x": 1, "eˣ": 1, ex: 1,
    "π": 1, pi: 1, "d/dx": 1, ddx: 1, derivada: 1,
    "m−": 1, "m-": 1, mmenos: 1, "memoria−": 1, sto: 1, almacenar: 1,
    off: 1, apagar: 1, integral: 1, "∫dx": 1, "∫": 1,
    euler: 1, "número e": 1, numeroe: 1,
    setup: 1, config: 1, configuración: 1, configuracion: 1,
    "s⇔d": 1, sd: 1, ans: 1, "x²": 1, x2: 1, cuadrado: 1,
    "x³": 1, x3: 1, cubo: 1, "x⁻¹": 1, "x^-1": 1, inversa: 1,
    "√": 1, "raíz": 1, raiz: 1, "x■": 1, potencia: 1, "^": 1,
    "log□": 1, logbase: 1, "×10ˣ": 1, "×10^x": 1, exp: 1, "ᴇ": 1,
    "m+": 1, mplus: 1, "=": 1, eq: 1, igual: 1,
    del: 1, delete: 1, borrar: 1, ac: 1, "all clear": 1, on: 1, mode: 1,
    shift: 1, alpha: 1, hyp: 1, h: 1, calc: 1, rcl: 1, eng: 1,
    "(": 1, ")": 1, "paréntesis": 1, parentesis: 1,
    "+": 1, "-": 1, "−": 1, menos: 1, "*": 1, "×": 1, por: 1, x: 1,
    "/": 1, "÷": 1, dividido: 1, ".": 1, punto: 1, coma: 1,
    "°′″": 1, dms: 1, grados: 1, sen: 1, tg: 1,
  };

  function seReconoce(txt) {
    let t = String(txt == null ? "" : txt).trim();
    if (!t) return true;
    let capa = "n";
    const m = t.match(/^(shift|alpha|hyp)\s*[:\-·]\s*(.+)$/i);
    if (m) {
      capa = m[1].toLowerCase() === "shift" ? "s" : m[1].toLowerCase() === "alpha" ? "a" : "h";
      t = m[2].trim();
    }
    const clave = t.toLowerCase();
    const letra = clave.toUpperCase();
    if (capa === "a" && LETRAS[letra]) return true;
    if (capa === "n") {
      if (/^[abcfxy]$/.test(clave) && LETRAS[letra]) return true;
      if (clave === "m" || clave === "e") return true;
    }
    if (ALIAS[clave]) return true;
    if (IDS.has(clave)) return true;
    return /^[0-9]$/.test(clave);
  }

  function validarCalculadora(v) {
    const errs = [];
    const lista = limpiaLista(v.funcionesDeshabilitadas);
    const malas = lista.filter((t) => !seReconoce(t));
    if (malas.length) {
      errs.push({
        k: "funcionesDeshabilitadas",
        msg: "No reconozco «" + malas.join("», «") + "». Usa teclas o funciones reales separadas por coma, ej: «sin, SHIFT:sin, ALPHA:D, integral, log, x!». Teclas: sin · cos · tan · log · ln · sqrt · sqr · cube · pow · inv · logBase · frac · exp · ans · sd · eng · dms · hyp · rcl · mplus · calc · integral · lpar · rpar · del · ac · mode · on · shift · alpha · eq · 0-9 · dot · add · sub · mul · div. Capas: «SHIFT:tecla», «ALPHA:letra (A-F, X, Y, M)», «hyp:tecla».",
      });
    }
    return errs;
  }

  /* ══ Entrada del REGISTRO (se reemplaza sola si ya existía) ══ */
  const entrada = {
    id: "calculadoraCientifica",
    nombre: "calculadoraCientifica — Calculadora científica",
    cat: "utils",
    archivo: "utils/calculadoraCientifica.js",
    imports: ["calculadoraCientifica"],
    funcion: "calculadoraCientifica",
    descripcion: "Calculadora científica interactiva tipo FX-991: LCD de dos filas (expresión + 7 segmentos), capas SHIFT/ALPHA/hyp, fracciones, trigonometría, logaritmos, π-e, factorial, Ans, variables, CALC, integral y d/dx. Permite DESHABILITAR teclas o funciones concretas (se atenúan y también se bloquea el teclado físico).",
    params: [
      { k: "funcionesDeshabilitadas", et: "Teclas/funciones DESHABILITADAS separadas por coma — vacío = todo habilitado", tipo: "texto", ej: "sin, SHIFT:sin, ALPHA:D, integral, log, x!" },
      { k: "modoAngulo", et: "Modo angular inicial", tipo: "opcion", ops: ["DEG", "RAD", "GRA"], def: "DEG" },
    ],
    aOpciones: (v) => ({
      funcionesDeshabilitadas: limpiaLista(v.funcionesDeshabilitadas),
      modoAngulo: v.modoAngulo || "DEG",
    }),
    aCodigo: (v) => ({
      funcionesDeshabilitadas: limpiaLista(v.funcionesDeshabilitadas),
      modoAngulo: v.modoAngulo || "DEG",
    }),
    /* ── A PRUEBA DE ERRORES: revisor espejo del util ── */
    validar: validarCalculadora,
  };
  /* Reemplaza o agrega: si ya está pegado este BLOQUE 38, esta versión
     ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
  const i = REGISTRO.findIndex((r) => r.id === "calculadoraCientifica");
  if (i >= 0) REGISTRO[i] = entrada;
  else REGISTRO.push(entrada);
})();
/* ═════════════════ fin BLOQUE 38 · «calculadoraCientifica» ═══════════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 39 · «formateadorEcuacionesQuimicas» — Ecuaciones químicas
   [visuales]
   Visual: recursos/js/visuales/ciencias/formateadorEcuacionesQuimicas.js
   Construye UNA ECUACIÓN QUÍMICA profesional y tipográficamente
   exacta: subíndices (H2O → H₂O, Ca(NO3)2 → Ca(NO₃)₂), cargas en
   superíndice («SO4 2-» → SO₄²⁻, «Fe3+» → Fe³⁺, «NO3-» → NO₃⁻),
   coeficientes resaltados delante (el 1 no se escribe), estados de
   agregación pequeños (s · l · g · ac), punto de hidratación
   (CuSO4·5H2O), efectos ↑ gas y ↓ precipitado, y la flecha central
   según el tipo: irreversible →, reversible ⇌, equilibrio ⇄, con
   los factores externos centrados SOBRE y DEBAJO (Δ, Calor,
   catalizador, °C, atm…). Tres temas: «clasico» (papel claro),
   «laboratorio» (tarjeta cuadriculada con rótulo) y «neon» (oscuro
   con brillo). Escala con el ancho del contenedor sin deformarse.
   Forma corta por especie: «[coeficiente]fórmula(estado)[↑|↓]»,
   ej: «2H2(g), O2(g)» → «2H2O(l)». El visual también acepta
   objetos: { formula, coeficiente, estado, efecto }.
   Obligatorio: reactivos y productos (AL MENOS UNO de cada); cada
   especie debe tener letras (una fórmula sin elementos no se puede
   leer). La PUERTA DE GUARDADO lo revisa con validarEcuacion().
   Si ya pegaste este BLOQUE 39 antes, este lo REEMPLAZA solo (mismo
   id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  const limpia = (s) => String(s == null ? "" : s).trim();
  const lista = (s) =>
    String(s == null ? "" : s)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  /* ── A PRUEBA DE ERRORES: espejo del lector del visual ──
     Una especie es legible si, quitando coeficiente inicial,
     (estado) final, flechas ↑↓ y la carga, quedan LETRAS
     (elementos). «123» o «!!» no lo son. */
  function especieLegible(txt) {
    let t = String(txt == null ? "" : txt).trim();
    if (!t) return false;
    t = t.replace(/^\d+\s*/, "");
    t = t.replace(/\s*\(([^()]*)\)\s*$/, "");
    t = t.replace(/[↑↓]\s*$/, "");
    t = t.replace(/\^?\s?\d*[+-]\s*$/, "").trim();
    return /[A-Za-z]/.test(t);
  }

  function validarEcuacion(v) {
    const errs = [];
    const re = lista(v.reactivos);
    const pr = lista(v.productos);

    if (!re.length) {
      errs.push({
        k: "reactivos",
        msg: "Escribe AL MENOS UN reactivo, ej: «2H2(g), O2(g)» — [coeficiente]fórmula(estado), separados por coma.",
      });
    } else {
      const malas = re.filter((t) => !especieLegible(t));
      if (malas.length) {
        errs.push({
          k: "reactivos",
          msg: "No puedo leer " + malas.map((m) => "«" + m + "»").join(", ") +
            " como fórmula: una especie necesita LETRAS (elementos), ej: H2SO4 · Ca(OH)2 · SO4 2- · Fe3+.",
        });
      }
    }

    if (!pr.length) {
      errs.push({
        k: "productos",
        msg: "Escribe AL MENOS UN producto, ej: «2H2O(l), CO2(g)↑» — con ↑ para gas liberado y ↓ para precipitado.",
      });
    } else {
      const malas = pr.filter((t) => !especieLegible(t));
      if (malas.length) {
        errs.push({
          k: "productos",
          msg: "No puedo leer " + malas.map((m) => "«" + m + "»").join(", ") +
            " como fórmula: una especie necesita LETRAS (elementos), ej: H2O · CaO · CO2 · AgCl.",
        });
      }
    }

    return errs;
  }

  /* ══ Entrada del REGISTRO (se reemplaza sola si ya existía) ══ */
  const entrada = {
    id: "formateadorEcuacionesQuimicas",
    nombre: "formateadorEcuacionesQuimicas — Ecuaciones químicas",
    cat: "visuales",
    archivo: "recursos/js/visuales/ciencias/formateadorEcuacionesQuimicas.js",
    imports: ["generarEcuacionQuimica"],
    funcion: "generarEcuacionQuimica",
    descripcion: "Ecuación química profesional y tipográficamente exacta: subíndices, cargas (SO4 2- → SO₄²⁻, Fe3+ → Fe³⁺), coeficientes resaltados, estados (s·l·g·ac), ↑ gas / ↓ precipitado y flecha según el tipo (irreversible →, reversible ⇌, equilibrio ⇄) con factores externos centrados sobre y bajo la flecha (Δ, Calor, Pt, °C, atm). Tres temas: clasico, laboratorio y neon.",
    params: [
      { k: "reactivos", et: "Reactivos separados por coma — [coeficiente]fórmula(estado)", tipo: "texto", ej: "2H2(g), O2(g)" },
      { k: "productos", et: "Productos separados por coma — ↑ gas / ↓ precipitado al final", tipo: "texto", ej: "2H2O(l), CO2(g)↑" },
      { k: "tipoReaccion", et: "Flecha de la reacción", tipo: "opcion", ops: ["irreversible", "reversible", "equilibrio"], def: "irreversible" },
      { k: "factorSuperior", et: "Factor SOBRE la flecha (calor, Δ, catalizador, °C, atm) — opcional", tipo: "texto", ej: "Δ · Calor · 200 °C · Pt" },
      { k: "factorInferior", et: "Factor DEBAJO de la flecha — opcional", tipo: "texto", ej: "1 atm · H2O · cat" },
      { k: "tema", et: "Tema visual", tipo: "opcion", ops: ["clasico", "laboratorio", "neon"], def: "clasico" },
    ],
    aOpciones: (v) => ({
      reactivos: lista(v.reactivos),
      productos: lista(v.productos),
      tipoReaccion: v.tipoReaccion || "irreversible",
      factoresFlecha: {
        superior: limpia(v.factorSuperior) || undefined,
        inferior: limpia(v.factorInferior) || undefined,
      },
      tema: v.tema || "clasico",
    }),
    aCodigo: (v) => ({
      reactivos: lista(v.reactivos),
      productos: lista(v.productos),
      tipoReaccion: v.tipoReaccion || "irreversible",
      factoresFlecha: {
        superior: limpia(v.factorSuperior) || undefined,
        inferior: limpia(v.factorInferior) || undefined,
      },
      tema: v.tema || "clasico",
    }),
    /* ── A PRUEBA DE ERRORES: revisor espejo del visual ── */
    validar: validarEcuacion,
  };
  /* Reemplaza o agrega: si ya está pegado este BLOQUE 39, esta versión
     ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
  const i = REGISTRO.findIndex((r) => r.id === "formateadorEcuacionesQuimicas");
  if (i >= 0) REGISTRO[i] = entrada;
  else REGISTRO.push(entrada);
})();
/* ═════════════════ fin BLOQUE 39 · «formateadorEcuacionesQuimicas» ═══ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 40 · «creadorFigurasGeometricas» — Creador de figuras geométricas (v2)
   [visuales]
   Visual: recursos/js/visuales/ciencias/creadorFigurasGeometricas.js
   Dibuja FIGURAS GEOMÉTRICAS A ESCALA con acabado profesional:
   · Planas: polígonos regulares (3–100 lados, medida del lado) e
     irregulares (lista de lados → polígono cíclico por bisección),
     círculos (radio) y elipses (radio mayor y menor).
   · Sólidos: prismas rectos e inclinados de cualquier base, pirámides,
     poliedros regulares platónicos (caras 4·6·8·12·20 + arista),
     cilindros, conos, conos truncados y esferas, con PROYECCIÓN
     ISOMÉTRICA, algoritmo del pintor y aristas ocultas discontinuas.
   · ROTACIÓN ELEGIBLE: «vistaGiro» (0–360°) y «vistaElev» (2–85°)
     para la vista completa, y «giro»/«elev» PROPIOS de cada figura
     (en planas el giro rota el dibujo en su plano; en sólidos gira
     sobre el eje vertical y «elev» ajusta la cámara de esa figura).
   · ACABADO PROFESIONAL: sombreado Lambert cara a cara, degradados en
     los sólidos de revolución, sombra proyectada en el suelo, cotas
     finas con halo y AUTO-AJUSTE del viewBox al bounding box real del
     SVG ya renderizado → LA FIGURA JAMÁS SALE CORTADA, a ningún ancho.
   · Composición de 2+ figuras con orientación «horizontal» (izquierda
     a derecha) o «vertical» (apiladas de arriba hacia abajo).
   · COTAS configurables por arreglo («cotas»): líneas de dimensión con
     flechas y etiquetas alineadas (lado, lados_individuales, apotema,
     altura, radio, diámetro, radioMayor/Menor, largo/ancho, generatriz,
     inclinación β, área lateral/total y volumen como fichas).
   · Estilo: color de borde, grosor, color de relleno y opacidad
     (semitransparente para ver la estructura interna del sólido).
     Temas: «clasico», «laboratorio» (cuadriculado con rótulo) y
     «neon» (oscuro con brillo). Escala UNIFORME: nunca se deforma.
   Forma corta por figura: «tipo;medidas;cotas=…», separadas por «|»:
     cilindro;r=4,h=10,giro=30;cotas=radio,altura
     poligono;n=5,L=4,giro=45;cotas=lado,apotema
     poligono;regular=no,medidas=4,5,6,7;cotas=lados_individuales
     prisma;n=6,L=3,h=8,inc=15,elev=50;cotas=lado,altura,inclinacion
     poliedroRegular;caras=12,L=2,giro=120;cotas=lado,volumen
     conoTruncado;R=6,rs=3,h=8,g=8.54;cotas=R,r,h,g
   Alias de medidas: n=lados · L=lado · h=altura · r=radio · R=radioBase
   · rs=radioSuperior · a=radioMayor · b=radioMenor · g=generatriz ·
   inc=inclinacion · giro=rotación propia (°) · rot=giro · elev=elevación
   propia de la vista (°, solo sólidos).
   Obligatorio: AL MENOS UNA figura y las medidas de cada tipo
   (poliedroRegular solo acepta caras 4·6·8·12·20; los lados de un
   irregular deben cumplir la desigualdad del polígono). La PUERTA DE
   GUARDADO lo revisa con validarFiguras() (espejo del visual).
   Si ya pegaste este BLOQUE 40 antes, este lo REEMPLAZA solo (mismo
   id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  const limpia = (s) => String(s == null ? "" : s).trim();

  const ALIAS_MEDIDA = {
    n: "lados", lados: "lados", L: "lado", lado: "lado", h: "altura",
    altura: "altura", r: "radio", radio: "radio", R: "radioBase",
    radioBase: "radioBase", rs: "radioSuperior", radioSuperior: "radioSuperior",
    a: "radioMayor", radioMayor: "radioMayor", b: "radioMenor",
    radioMenor: "radioMenor", g: "generatriz", generatriz: "generatriz",
    inc: "inclinacion", inclinacion: "inclinacion", caras: "caras",
    giro: "giro", rot: "giro", elev: "elev",
  };

  const CLAVES_NUM = ["lados", "lado", "altura", "radio", "radioMayor",
    "radioMenor", "radioBase", "radioSuperior", "generatriz",
    "inclinacion", "caras", "giro", "elev"];

  function normaTipo(t) {
    const s = String(t == null ? "" : t).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/^(poligono|polygon)/.test(s)) return "poligono";
    if (/^(circulo|circle)/.test(s)) return "circulo";
    if (/^(elipse|ellipse)/.test(s)) return "elipse";
    if (/^prisma|^prism/.test(s)) return "prisma";
    if (/^piramide|^pyramid/.test(s)) return "piramide";
    if (/^(poliedro|platonic)/.test(s)) return "poliedroRegular";
    if (/(truncado|tronco)/.test(s)) return "conoTruncado";
    if (/^cono|^cone/.test(s)) return "cono";
    if (/^(cilindro|cylinder)/.test(s)) return "cilindro";
    if (/^(esfera|sphere|bola)/.test(s)) return "esfera";
    return null;
  }

  /* ── Lector de la forma corta: «tipo;clave=valor,…;cotas=a,b» ── */
  function leeFiguras(txt) {
    return String(txt == null ? "" : txt)
      .split("|")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        const partes = t.split(";").map((x) => x.trim()).filter(Boolean);
        const fig = { tipo: partes[0] || "" };
        let listaActiva = null;
        for (let i = 1; i < partes.length; i++) {
          for (const par of partes[i].split(",")) {
            const trozo = par.trim();
            if (!trozo) continue;
            const m = trozo.match(/^([A-Za-z_]+)\s*=\s*(.*)$/);
            if (!m) {
              /* valor suelto: continúa la última lista (cotas/medidas) */
              if (listaActiva === "cotas" && Array.isArray(fig.cotas)) fig.cotas.push(trozo);
              else if (listaActiva === "medidas" && Array.isArray(fig.medidas)) {
                const n = Number(trozo.replace(",", "."));
                if (Number.isFinite(n) && n > 0) fig.medidas.push(n);
              }
              continue;
            }
            const clave = m[1], valor = m[2].trim();
            if (clave === "cotas") {
              fig.cotas = [valor];
              listaActiva = "cotas";
            } else if (clave === "medidas") {
              const n = Number(valor.replace(",", "."));
              fig.medidas = Number.isFinite(n) && n > 0 ? [n] : [];
              listaActiva = "medidas";
            } else if (clave === "regular") {
              fig.regular = !/^(no|false|0)$/i.test(valor);
              listaActiva = null;
            } else if (ALIAS_MEDIDA[clave]) {
              fig[ALIAS_MEDIDA[clave]] = Number(valor.replace(",", "."));
              listaActiva = null;
            }
          }
        }
        return fig;
      });
  }

  /* ── A PRUEBA DE ERRORES: espejo del visual ── */
  const MEDIDAS_REQ = {
    poligono: ["lado"], circulo: ["radio"], elipse: ["radioMayor", "radioMenor"],
    prisma: ["lados", "lado", "altura"], piramide: ["lados", "lado", "altura"],
    poliedroRegular: ["caras", "lado"], cilindro: ["radio", "altura"],
    cono: ["radio", "altura"], esfera: ["radio"],
    conoTruncado: ["radioBase", "radioSuperior", "altura"],
  };
  const EJEMPLO = {
    poligono: "poligono;n=5,L=4", circulo: "circulo;r=5",
    elipse: "elipse;a=7,b=4", prisma: "prisma;n=6,L=3,h=8",
    piramide: "piramide;n=4,L=4,h=7", poliedroRegular: "poliedroRegular;caras=8,L=3",
    cilindro: "cilindro;r=4,h=10", cono: "cono;r=4,h=9",
    esfera: "esfera;r=5", conoTruncado: "conoTruncado;R=6,rs=3,h=8",
  };
  const COTAS_VALIDAS = {
    poligono: ["lado", "lados_individuales", "apotema", "perimetro", "area"],
    circulo: ["radio", "diametro", "perimetro", "area"],
    elipse: ["radioMayor", "radioMenor", "largo", "ancho", "area"],
    prisma: ["lado", "altura", "apotemaBase", "inclinacion", "areaLateral", "areaTotal", "volumen"],
    piramide: ["lado", "altura", "apotemaBase", "apotemaLateral", "areaLateral", "areaTotal", "volumen"],
    poliedroRegular: ["lado", "areaTotal", "volumen"],
    cilindro: ["radio", "diametro", "altura", "areaLateral", "areaTotal", "volumen"],
    cono: ["radio", "diametro", "altura", "generatriz", "areaLateral", "areaTotal", "volumen"],
    esfera: ["radio", "diametro", "areaTotal", "volumen"],
    conoTruncado: ["radioBase", "radioSuperior", "diametroBase", "diametroSuperior", "altura", "generatriz", "areaLateral", "areaTotal", "volumen"],
  };

  function validarFiguras(v) {
    const errs = [];
    const figuras = leeFiguras(v.figuras);
    if (!figuras.length) {
      errs.push({
        k: "figuras",
        msg: "Escribe AL MENOS UNA figura, ej: «cilindro;r=4,h=10;cotas=radio,altura» — tipo;medidas;cotas — y «|» para varias: «cilindro;r=4,h=10|cono;r=4,h=9».",
      });
      return errs;
    }
    figuras.forEach((f, i) => {
      const ordinal = (i + 1) + "ª";
      const tipo = normaTipo(f.tipo);
      if (!tipo) {
        errs.push({
          k: "figuras",
          msg: "La " + ordinal + " figura «" + (f.tipo || "¿vacía?") + "» no es un tipo válido: poligono, circulo, elipse, prisma, piramide, poliedroRegular, cilindro, cono, conoTruncado, esfera.",
        });
        return;
      }
      let req = MEDIDAS_REQ[tipo] || [];
      if (tipo === "poligono" && (f.regular === false || Array.isArray(f.medidas))) {
        req = []; /* irregular: exige la LISTA de lados, no «lado» */
        if (!Array.isArray(f.medidas) || f.medidas.length < 3) {
          errs.push({
            k: "figuras",
            msg: "El polígono irregular necesita la LISTA de medidas de todos sus lados (al menos 3), ej: «poligono;regular=no,medidas=4,5,6,7;cotas=lados_individuales».",
          });
        }
      }
      const faltan = req.filter((kk) => !(Number(f[kk]) > 0));
      if (faltan.length) {
        errs.push({
          k: "figuras",
          msg: "A la " + ordinal + " figura («" + tipo + "») le falta" + (faltan.length > 1 ? "n" : "") +
            " la medida" + (faltan.length > 1 ? "s" : "") + ": " + faltan.join(", ") +
            ". Ej: «" + EJEMPLO[tipo] + "».",
        });
      }
      if (tipo === "poliedroRegular" && Number(f.caras) > 0 && ![4, 6, 8, 12, 20].includes(Number(f.caras))) {
        errs.push({
          k: "figuras",
          msg: "Las caras del poliedro regular solo pueden ser 4 (tetraedro), 6 (cubo), 8 (octaedro), 12 (dodecaedro) o 20 (icosaedro); pusiste «" + f.caras + "».",
        });
      }
      if (f.giro !== undefined && !Number.isFinite(f.giro)) {
        errs.push({
          k: "figuras",
          msg: "El giro de la " + ordinal + " figura debe ser un número de grados, ej: «giro=30» (0–360).",
        });
      }
      if (f.elev !== undefined && (!Number.isFinite(f.elev) || f.elev <= 0)) {
        errs.push({
          k: "figuras",
          msg: "La elevación propia (elev) de la " + ordinal + " figura debe ser un ángulo en grados entre 2 y 85, ej: «elev=50».",
        });
      }
      (f.cotas || []).forEach((c) => {
        if (!COTAS_VALIDAS[tipo].includes(c)) {
          errs.push({
            k: "figuras",
            msg: "La cota «" + c + "» no existe para «" + tipo + "». Válidas: " + COTAS_VALIDAS[tipo].join(", ") + ".",
          });
        }
      });
    });
    return errs;
  }

  /* ══ Entrada del REGISTRO (se reemplaza sola si ya existía) ══ */
  const entrada = {
    id: "creadorFigurasGeometricas",
    nombre: "creadorFigurasGeometricas — Figuras geométricas",
    cat: "visuales",
    archivo: "recursos/js/visuales/matematicas/creadorFigurasGeometricas.js",
    imports: ["generarFigurasGeometricas"],
    funcion: "generarFigurasGeometricas",
    descripcion: "Creador visual de figuras geométricas con acabado profesional y trazadas a escala: polígonos regulares (3–100 lados) e irregulares (polígono cíclico con la lista de lados), círculos, elipses, prismas rectos e inclinados, pirámides, poliedros regulares platónicos (caras 4·6·8·12·20), cilindros, conos, conos truncados y esferas con proyección isométrica, aristas ocultas discontinuas, sombreado Lambert, degradados y sombra en el suelo. ROTACIÓN ELEGIBLE: vistaGiro/vistaElev de la escena y giro/elev propios por figura. Auto-ajuste del viewBox: la figura nunca sale cortada. Cotas con flechas (lado, apotema, altura, radio, diámetro, radioMayor/Menor, generatriz, inclinación β, áreas y volumen) y composiciones verticales u horizontales. Temas: clasico, laboratorio, neon.",
    params: [
      { k: "figuras", et: "Figuras — tipo;medidas;cotas=… (varias con |)", tipo: "area", req: true, ej: "cilindro;r=4,h=10,giro=30;cotas=radio,altura|cono;r=4,h=9;cotas=radio,generatriz" },
      { k: "composicion", et: "Orientación de la composición", tipo: "opcion", ops: ["horizontal", "vertical"], def: "horizontal" },
      { k: "espacio", et: "Espacio entre figuras (px)", tipo: "num", def: "34" },
      { k: "vistaGiro", et: "Giro de la vista en grados 0–360 (opcional)", tipo: "num", def: "45" },
      { k: "vistaElev", et: "Elevación de la vista en grados 2–85 (opcional)", tipo: "num", def: "35.3" },
      { k: "borde", et: "Color del borde (hex, opcional)", tipo: "texto", ej: "#1e3a5f" },
      { k: "relleno", et: "Color de relleno (hex, opcional)", tipo: "texto", ej: "#3b82f6" },
      { k: "grosor", et: "Grosor del trazo", tipo: "num", def: "2.4" },
      { k: "opacidad", et: "Opacidad del relleno (0.05–1)", tipo: "num", def: "0.35" },
      { k: "unidad", et: "Unidad de las cotas (opcional)", tipo: "texto", ej: "cm · m · u" },
      { k: "tema", et: "Tema visual", tipo: "opcion", ops: ["clasico", "laboratorio", "neon"], def: "clasico" },
    ],
    aOpciones: (v) => {
      const o = {
        figuras: leeFiguras(v.figuras),
        composicion: v.composicion === "vertical" ? "vertical" : "horizontal",
        espacio: Number(v.espacio) > 0 ? Number(v.espacio) : 34,
        borde: limpia(v.borde) || undefined,
        relleno: limpia(v.relleno) || undefined,
        grosor: Number(v.grosor) > 0 ? Number(v.grosor) : 2.4,
        opacidad: Math.min(1, Math.max(0.05, Number(v.opacidad) || 0.35)),
        unidad: limpia(v.unidad) || undefined,
        tema: v.tema || "clasico",
      };
      const vg = Number(v.vistaGiro), ve = Number(v.vistaElev);
      const vista = {};
      if (limpia(v.vistaGiro) !== "" && Number.isFinite(vg)) vista.giro = vg;
      if (limpia(v.vistaElev) !== "" && Number.isFinite(ve)) vista.elevacion = ve;
      if (vista.giro !== undefined || vista.elevacion !== undefined) o.vista = vista;
      return o;
    },
    aCodigo: (v) => {
      const figuras = leeFiguras(v.figuras).map((f) => {
        const o = { tipo: normaTipo(f.tipo) || f.tipo };
        CLAVES_NUM.forEach((k) => { if (f[k] !== undefined) o[k] = f[k]; });
        if (!Number(o.giro)) delete o.giro;
        if (o.elev !== undefined && !Number(o.elev)) delete o.elev;
        if (f.regular === false) { o.regular = false; }
        if (Array.isArray(f.medidas)) o.medidas = f.medidas;
        if (Array.isArray(f.cotas)) o.cotas = f.cotas;
        return o;
      });
      const codigo = {
        figuras,
        composicion: v.composicion === "vertical" ? "vertical" : "horizontal",
        espacio: Number(v.espacio) > 0 ? Number(v.espacio) : 34,
        tema: v.tema || "clasico",
      };
      const vg = Number(v.vistaGiro), ve = Number(v.vistaElev);
      if (limpia(v.vistaGiro) !== "" && Number.isFinite(vg)) codigo.vista = { giro: vg };
      if (limpia(v.vistaElev) !== "" && Number.isFinite(ve)) {
        codigo.vista = { ...(codigo.vista || {}), elevacion: ve };
      }
      if (limpia(v.borde)) codigo.borde = limpia(v.borde);
      if (limpia(v.relleno)) codigo.relleno = limpia(v.relleno);
      if (Number(v.grosor) > 0) codigo.grosor = Number(v.grosor);
      if (Number(v.opacidad) > 0) codigo.opacidad = Math.min(1, Number(v.opacidad));
      if (limpia(v.unidad)) codigo.unidad = limpia(v.unidad);
      return codigo;
    },
    /* ── A PRUEBA DE ERRORES: revisor espejo del visual ── */
    validar: validarFiguras,
  };
  /* Reemplaza o agrega: si ya está pegado este BLOQUE 40, esta versión
     ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
  const i = REGISTRO.findIndex((r) => r.id === "creadorFigurasGeometricas");
  if (i >= 0) REGISTRO[i] = entrada;
  else REGISTRO.push(entrada);
})();
/* ═══════════════════ fin BLOQUE 40 · «creadorFigurasGeometricas» ═════ */

/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 41 · «oracionesIngles» — Revisor de oraciones (inglés/español)
   [utils] · v2
   Util: js/utils/ingles/oracionesIngles.js
   Herramienta interactiva de ESCRITURA Y EVALUACIÓN en DOS INTENTOS
   con tarjeta COLORIDA (color configurable; nada de papel crema):
   cabecera con degradado del color elegido, campos con renglones y
   marcas de corrección tipo corrector. El estudiante escribe
   «cantidadInputs» oraciones y presiona «Enviar / Check»: se revisan
   ortografía, gramática y estructura; cada fragmento con error se
   marca en ROJO brillante y, al pasar el mouse o al tocarlo, muestra
   la explicación («Spelling error: Did you mean 'thought'?»,
   «Grammar error: subject–verb agreement…», mayúscula inicial, punto
   final…). Las oraciones totalmente correctas se APRUEBAN en verde y
   quedan congeladas; se avisa que queda 1 intento para corregir las
   marcadas y el botón pasa a «Revisar Correcciones» (reevaluación
   final). PUNTAJE EQUITATIVO: puntajeTotal se reparte en partes
   iguales (puntajeTotal / cantidadInputs por oración) y cada oración
   obtiene su puntaje completo SOLO si queda sin errores al finalizar;
   panel final con el total obtenido y el desglose por oración.
   NUEVO v2 — «estructuraEsperada»: el docente escribe el TIEMPO
   GRAMATICAL y/o el PATRÓN que el estudiante debe respetar (ej.:
   «Past Simple», «subject + verb + adverb of frequency», «subject +
   verb + object + time expression», «pasado simple») y el corrector
   lo valida oración por oración: detecta el tiempo (Past/Present
   Simple, Continuous, Perfect, will, going to; en español presente,
   pretérito, imperfecto, futuro, continuo) y la presencia/posición de
   cada parte (el adverbio de frecuencia va ENTRE el sujeto y el verbo
   o después de «be»); marca el fragmento y explica qué corregir, para
   que el estudiante no escriba lo que quiera. Se muestra en una
   franja «Estructura esperada» dentro de la tarjeta.
   NUEVO v2 — «colorTarjeta»: color de la tarjeta en HEX o rgb()
   (defecto #7c3aed). REGLA DEL PROYECTO: en adelante TODOS los utils
   y visuales aceptan este parámetro opcional con un color por defecto.
   «usarApiExterna» activa la API gratuita de LanguageTool
   (api.languagetool.org, UNA petición por intento con todas las
   oraciones; si falla, avisa y repliega al revisor local). Las
   comprobaciones de estructura y estructuraEsperada SIEMPRE se suman.
   «idioma» elige el idioma evaluado: «en» (defecto, explicaciones en
   inglés) o «es» (explicaciones en español) — el revisor local
   también funciona sin red.
   Obligatorio: indicacion con letras, cantidadInputs entero 1–50 y
   puntajeTotal > 0. Opcional: estructuraEsperada (texto libre) y
   colorTarjeta (HEX/rgb; se valida el formato). La PUERTA DE
   GUARDADO lo revisa con validarOraciones() (espejo del util).
   Si ya pegaste este BLOQUE 41 antes, este lo REEMPLAZA solo (mismo
   id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  const limpia = (s) => String(s == null ? "" : s).trim();
  const numDe = (v) => Number(String(v == null ? "" : v).replace(",", "."));

  /* ── A PRUEBA DE ERRORES: espejo del util ── */
  function validarOraciones(v) {
    const errs = [];
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñü]/.test(limpia(v.indicacion))) {
      errs.push({
        k: "indicacion",
        msg: "Escribe la INDICACIÓN de la actividad con letras, ej: «Write 3 sentences in Past Simple.».",
      });
    }
    const cantidad = numDe(v.cantidadInputs);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) {
      errs.push({
        k: "cantidadInputs",
        msg: "La cantidad de oraciones debe ser un NÚMERO ENTERO entre 1 y 50, ej: 3.",
      });
    }
    const puntaje = numDe(v.puntajeTotal);
    if (!Number.isFinite(puntaje) || puntaje <= 0) {
      errs.push({
        k: "puntajeTotal",
        msg: "El puntaje total debe ser un NÚMERO mayor que 0, ej: 10.",
      });
    }
    const color = limpia(v.colorTarjeta);
    if (color && !/^(#([0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*\d{1,3}\s*[, ]\s*\d{1,3}\s*[, ]\s*\d{1,3})/i.test(color)) {
      errs.push({
        k: "colorTarjeta",
        msg: "El COLOR de la tarjeta debe ser un valor HEX o rgb() válido, ej: #7c3aed o #0ea5e9.",
      });
    }
    return errs;
  }

  /* ══ Entrada del REGISTRO (se reemplaza sola si ya existía) ══ */
  const entrada = {
    id: "oracionesIngles",
    nombre: "oracionesIngles — Revisor de oraciones (inglés/español)",
    cat: "utils",
    archivo: "utils/ingles/oracionesIngles.js",
    imports: ["generarRevisorOraciones"],
    funcion: "generarRevisorOraciones",
    descripcion: "Revisor de redacción en DOS INTENTOS con tarjeta colorida (colorTarjeta configurable, defecto #7c3aed): el estudiante escribe las oraciones, «Enviar / Check» marca en ROJO los fragmentos con errores (ortografía, gramática, estructura y la ESTRUCTURA ESPERADA del docente: tiempo gramatical y/o patrón como «subject + verb + adverb of frequency», validada oración por oración) con explicación al pasar el mouse o al tocar, aprueba en verde y congela las correctas, y «Revisar Correcciones» reevalúa tras el segundo intento. Puntaje equitativo (puntajeTotal / cantidadInputs por oración) con panel final y desglose. Revisor local propio (inglés y español) más API gratuita de LanguageTool opcional (usarApiExterna).",
    params: [
      { k: "indicacion", et: "Indicación de la actividad (instrucciones para el estudiante)", tipo: "area", req: true, ej: "Write 3 sentences in Past Simple." },
      { k: "cantidadInputs", et: "Cantidad de oraciones (1–50)", tipo: "num", req: true, def: "3" },
      { k: "puntajeTotal", et: "Puntaje total de la actividad (se reparte en partes iguales)", tipo: "num", req: true, def: "10" },
      { k: "estructuraEsperada", et: "Estructura esperada (tiempo gramatical y/o patrón con +; el corrector la valida; vacío = solo ortografía/gramática)", tipo: "area", ej: "subject + verb + adverb of frequency · Past Simple · pasado simple" },
      { k: "idioma", et: "Idioma que se evalúa", tipo: "opcion", ops: ["en", "es"], def: "en" },
      { k: "usarApiExterna", et: "Revisor externo LanguageTool (requiere internet; si falla usa el local)", tipo: "opcion", ops: ["no", "sí"], def: "no" },
      { k: "colorTarjeta", et: "Color de la tarjeta en HEX o rgb() (opcional; defecto #7c3aed)", tipo: "texto", def: "#7c3aed", ej: "#7c3aed · #0ea5e9" },
    ],
    aOpciones: (v) => ({
      indicacion: limpia(v.indicacion) || "Escribe las oraciones solicitadas.",
      cantidadInputs: Math.max(1, Math.min(50, Math.floor(numDe(v.cantidadInputs)) || 1)),
      puntajeTotal: numDe(v.puntajeTotal) > 0 ? numDe(v.puntajeTotal) : 10,
      estructuraEsperada: limpia(v.estructuraEsperada),
      idioma: v.idioma === "es" ? "es" : "en",
      usarApiExterna: v.usarApiExterna === "sí" || v.usarApiExterna === "si",
      colorTarjeta: limpia(v.colorTarjeta) || "#7c3aed",
    }),
    aCodigo: (v) => ({
      indicacion: limpia(v.indicacion) || "Escribe las oraciones solicitadas.",
      cantidadInputs: Math.max(1, Math.min(50, Math.floor(numDe(v.cantidadInputs)) || 1)),
      puntajeTotal: numDe(v.puntajeTotal) > 0 ? numDe(v.puntajeTotal) : 10,
      estructuraEsperada: limpia(v.estructuraEsperada),
      idioma: v.idioma === "es" ? "es" : "en",
      usarApiExterna: v.usarApiExterna === "sí" || v.usarApiExterna === "si",
      colorTarjeta: limpia(v.colorTarjeta) || "#7c3aed",
    }),
    /* ── A PRUEBA DE ERRORES: revisor espejo del util ── */
    validar: validarOraciones,
  };
  /* Reemplaza o agrega: si ya está pegado este BLOQUE 41, esta versión
     ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
  const i = REGISTRO.findIndex((r) => r.id === "oracionesIngles");
  if (i >= 0) REGISTRO[i] = entrada;
  else REGISTRO.push(entrada);
})();
/* ═════════════════ fin BLOQUE 41 · «oracionesIngles» ═════════════════ */


/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 42 · «botonEnviar» — Botón Enviar del examen   [utils]
   Util: js/utils/botonEnviar.js
   El botón ENVIAR que se coloca AL FINAL de un examen (donde el
   docente quiera, arrastrándolo en el lienzo). Al tocarlo (con
   confirmación opcional) se hace el ENVÍO COMPLETO del examen:
   1) se califican TODOS los bloques de actividad de la página que el
      estudiante NO envió uno a uno (los utils se registran solos:
      opcionMultiple, multipleOpcion, respuestaSimple, ordenar,
      relacionar, sopaLetras, crucigrama, blank…); lo vacío o
      incorrecto vale 0 (regla de siempre);
   2) se fija nota.enviado, se guarda en Firestore/localStorage y se
      reporta el TOTAL al Sheet UNA vez (finalizarExamen);
   3) el botón queda «Examen enviado · Nota final: X pts», se oculta
      la caja de envío por defecto (#cg-envio) del archivo generado
      para NO duplicar botones y se habilita la salida.
   Si el examen ya venía enviado, arranca mostrando ese estado con la
   nota guardada. Vista docente: demo sin guardado. En clase/tarea se
   ve pero avisa que solo envía exámenes.
   ENLAZADO con el BLOQUE 43 «timer»: comparten el mismo envío
   (window.__mcoEnvioExamen) — si el tiempo se acaba ANTES, el reloj
   dispara el mismo envío (sin confirmación) y este botón queda
   sincronizado con el aviso «Se acabó el tiempo…».
   NUEVO (REGLA DEL PROYECTO): colorTarjeta opcional en HEX/rgb con
   defecto #16a34a (verde envío); todos los utils/visuales lo
   aceptan en adelante.
   Obligatorio: nada (todo tiene defecto). Opcional: texto, titulo,
   confirmar y colorTarjeta (se valida el formato).
   Si ya pegaste este BLOQUE 42 antes, este lo REEMPLAZA solo (mismo
   id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  const limpia = (s) => String(s == null ? "" : s).trim();

  /* ── A PRUEBA DE ERRORES: espejo del util ── */
  function validarBoton(v) {
    const errs = [];
    const color = limpia(v.colorTarjeta);
    if (color && !/^(#([0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*\d{1,3}\s*[, ]\s*\d{1,3}\s*[, ]\s*\d{1,3})/i.test(color)) {
      errs.push({
        k: "colorTarjeta",
        msg: "El COLOR del botón debe ser un valor HEX o rgb() válido, ej: #16a34a o #0ea5e9.",
      });
    }
    return errs;
  }

  /* ══ Entrada del REGISTRO (se reemplaza sola si ya existía) ══ */
  const entrada = {
    id: "botonEnviar",
    nombre: "botonEnviar — Botón Enviar del examen",
    cat: "utils",
    archivo: "utils/botonEnviar.js",
    imports: ["botonEnviar"],
    funcion: "botonEnviar",
    descripcion:
      "El botón ENVIAR al final del examen: califica todos los bloques de actividad de la página que quedaron sin enviar, guarda la nota y reporta al Sheet (una vez), muestra «Examen enviado · Nota final» y cierra el examen. Confirmación opcional. ENLAZADO con «timer — Temporizador de examen»: si el tiempo se acaba, el reloj dispara el MISMO envío sin confirmar. Color configurable (colorTarjeta, defecto #16a34a).",
    params: [
      { k: "texto", et: "Rótulo del botón", tipo: "texto", def: "Enviar examen" },
      { k: "titulo", et: "Título del examen para el reporte (opcional; defecto: el título de la pieza)", tipo: "texto" },
      { k: "confirmar", et: "Pedir confirmación al tocar (el temporizador nunca confirma)", tipo: "sino", def: true },
      { k: "colorTarjeta", et: "Color del botón en HEX o rgb() (opcional; defecto #16a34a)", tipo: "texto", def: "#16a34a", ej: "#16a34a · #7c3aed" },
    ],
    /* ctx trae el perfil DEMO y la clase de la vista previa: sin ellos
       el util se levanta los pantalones y NO pinta nada. Mismo patrón
       del resto de utils (BLOQUE 20, 21…). */
    aOpciones: (v, ctx) => ({
      texto: limpia(v.texto) || "Enviar examen",
      titulo: limpia(v.titulo) || undefined,
      confirmar: bool(v.confirmar, true),
      colorTarjeta: limpia(v.colorTarjeta) || "#16a34a",
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      texto: limpia(v.texto) || "Enviar examen",
      titulo: limpia(v.titulo) || undefined,
      confirmar: bool(v.confirmar, true),
      colorTarjeta: limpia(v.colorTarjeta) || "#16a34a",
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),
    /* ── A PRUEBA DE ERRORES: revisor espejo del util ── */
    validar: validarBoton,
  };
  /* Reemplaza o agrega: si ya está pegado este BLOQUE 42, esta versión
     ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
  const i = REGISTRO.findIndex((r) => r.id === "botonEnviar");
  if (i >= 0) REGISTRO[i] = entrada;
  else REGISTRO.push(entrada);
})();
/* ═══════════════════ fin BLOQUE 42 · «botonEnviar» ═══════════════════ */
/* ══════════════════════════════════════════════════════════════════════
   BLOQUE 43 · «timer» — Temporizador de examen   [utils]
   Util: js/utils/timer.js
   Cuenta regresiva ENLAZADA al botón Enviar: el docente pasa el
   TIEMPO que tienen los estudiantes para el examen y, al llegar a 0,
   el examen SE ENVÍA SOLO (el mismo envío de «botonEnviar»: califica
   todo lo pendiente, guarda la nota y la reporta al Sheet) — sin
   confirmación, como debe ser. Reloj con ⏱ + rótulo + barra de
   progreso del color elegido: AMBAR cuando queda ≤ 20 % (o ≤ 5 min)
   y ROJO pulsante cuando queda ≤ 1 min (o ≤ 10 %).
   ANTI-TRAMPA: el tiempo QUE QUEDA se recuerda en localStorage como
   FECHA LÍMITE (mco_timer_{uid}_{claseId}_{id}): si el estudiante
   recarga, el reloj SIGUE por donde iba (no reinicia); si la fecha
   límite ya pasó, envía de inmediato. Si el examen ya venía enviado,
   el reloj arranca detenido con «Examen enviado · Nota final: X pts».
   Vista docente: demo que corre pero NO envía nada. En clase/tarea
   cuenta y avisa «Tiempo agotado» sin enviar (el envío automático
   solo aplica a exámenes).
   'tiempo' acepta: MINUTOS (45) · "45" · "45 min" · "90m" · "1h 30m" ·
   "1:30" (1 min 30 s) · "1:00:00" (1 hora).
   NUEVO (REGLA DEL PROYECTO): colorTarjeta opcional en HEX/rgb con
   defecto #0ea5e9 (celeste reloj).
   Obligatorio: 'tiempo' interpretable como duración. Opcional:
   texto (rótulo), id estable (recomendado) y colorTarjeta.
   Si ya pegaste este BLOQUE 43 antes, este lo REEMPLAZA solo (mismo
   id: la entrada del REGISTRO se actualiza, no se duplica).
   ══════════════════════════════════════════════════════════════════════ */
(() => {
  const limpia = (s) => String(s == null ? "" : s).trim();

  /* ── A PRUEBA DE ERRORES: espejo de parseTiempo del util ── */
  const ES_MIN = /^\s*\d+(\.\d+)?\s*$/;
  const ES_RELOJ = /^\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*$/;
  const ES_COMB = /(\d+(?:[.,]\d+)?)\s*(?:h|hr|hora|horas)\b|(\d+(?:[.,]\d+)?)\s*(?:m|min|minutos?)\b|(\d+)\s*(?:s|seg|segundos?)\b/i;

  function segundosDe(v) {
    const s = limpia(v);
    if (!s) return null;
    if (ES_MIN.test(s)) {
      const min = Number(s.replace(",", "."));
      return min > 0 ? Math.max(1, Math.round(min * 60)) : null;
    }
    const r = s.match(ES_RELOJ);
    if (r) {
      const a = +r[1], b = +r[2], c = r[3] != null ? +r[3] : null;
      if (b > 59 || (c != null && c > 59)) return null;
      const total = c == null ? a * 60 + b : a * 3600 + b * 60 + c;
      return total > 0 ? Math.round(total) : null;
    }
    if (ES_COMB.test(s)) return 1; // combinación h/m/s: el util la afina
    return null;
  }

  function validarTimer(v) {
    const errs = [];
    if (!segundosDe(v.tiempo)) {
      errs.push({
        k: "tiempo",
        msg: "El TIEMPO no se entiende: pasa MINUTOS (45), «45 min», «90m», «1h 30m», «1:30» (1 min 30 s) o «1:00:00» (1 hora).",
      });
    }
    const color = limpia(v.colorTarjeta);
    if (color && !/^(#([0-9a-f]{3}|[0-9a-f]{6})|rgba?\(\s*\d{1,3}\s*[, ]\s*\d{1,3}\s*[, ]\s*\d{1,3})/i.test(color)) {
      errs.push({
        k: "colorTarjeta",
        msg: "El COLOR del reloj debe ser un valor HEX o rgb() válido, ej: #0ea5e9 o #f59e0b.",
      });
    }
    return errs;
  }

  /* ══ Entrada del REGISTRO (se reemplaza sola si ya existía) ══ */
  const entrada = {
    id: "timer",
    nombre: "timer — Temporizador de examen",
    cat: "utils",
    archivo: "utils/timer.js",
    imports: ["temporizador"],
    funcion: "temporizador",
    descripcion:
      "Cuenta regresiva del examen ENLAZADA al botón Enviar: al llegar a 0 el examen SE ENVÍA SOLO (califica lo pendiente, guarda la nota y la reporta al Sheet) sin confirmación. Reloj ⏱ con barra de progreso; ámbar al quedar ≤ 20 % y rojo pulsante al quedar ≤ 1 min. El tiempo restante se recuerda aunque recarguen la página (anti-trampa) y si ya pasó envía de inmediato. 'tiempo' acepta minutos (45), «45 min», «90m», «1h 30m», «1:30» o «1:00:00». Color configurable (colorTarjeta, defecto #0ea5e9).",
    params: [
      { k: "tiempo", et: "Tiempo para el examen (minutos o «1h 30m», «mm:ss»…)", tipo: "texto", req: true, def: "45", ej: "45 · 90m · 1h 30m · 1:30 · 1:00:00" },
      { k: "texto", et: "Rótulo del reloj", tipo: "texto", def: "Tiempo restante" },
      { k: "id", et: "id estable del reloj (opcional, recomendado: no reinicia al recargar)", tipo: "texto", ej: "tiempo-examen-1" },
      { k: "colorTarjeta", et: "Color del reloj en HEX o rgb() (opcional; defecto #0ea5e9)", tipo: "texto", def: "#0ea5e9", ej: "#0ea5e9 · #f59e0b" },
    ],
    /* ctx trae el perfil DEMO y la clase de la vista previa: sin ellos
       el util se levanta los pantalones y NO pinta nada. Mismo patrón
       del resto de utils (BLOQUE 20, 21…). */
    aOpciones: (v, ctx) => ({
      tiempo: limpia(v.tiempo) || "45",
      texto: limpia(v.texto) || "Tiempo restante",
      id: limpia(v.id) || undefined,
      colorTarjeta: limpia(v.colorTarjeta) || "#0ea5e9",
      tipo: ctx.tipo,
      perfil: ctx.perfil,
      clase: ctx.clase,
    }),
    aCodigo: (v, ctx) => ({
      tiempo: limpia(v.tiempo) || "45",
      texto: limpia(v.texto) || "Tiempo restante",
      id: limpia(v.id) || undefined,
      colorTarjeta: limpia(v.colorTarjeta) || "#0ea5e9",
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),
    /* ── A PRUEBA DE ERRORES: revisor espejo del util ── */
    validar: validarTimer,
  };
  /* Reemplaza o agrega: si ya está pegado este BLOQUE 43, esta versión
     ACTUALIZA su entrada (mismo id) en vez de duplicarla. */
  const j = REGISTRO.findIndex((r) => r.id === "timer");
  if (j >= 0) REGISTRO[j] = entrada;
  else REGISTRO.push(entrada);
})();
/* ═══════════════════ fin BLOQUE 43 · «timer» ═══════════════════ */