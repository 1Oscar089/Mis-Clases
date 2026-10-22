// ============================================================
// crear.js — EDITOR VISUAL «Crear» (js/components/crear.js) · v5
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
// EXTENDER (futuras actualizaciones): buscar «REGISTRO DE RECURSOS»
// aquí abajo y AGREGAR una entrada a la lista REGISTRO (con ruta
// "componentes/archivo.js" o "utils/archivo.js"). Con eso el recurso
// sale solo en el panel izquierdo, su formulario, la vista previa y
// el código descargado. Nada más que tocar.
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

function urlDeRecurso(r) {
  return new URL(r.archivo, RAIZ_JS).href;
}

/* ============================================================
   REGISTRO DE RECURSOS
   ------------------------------------------------------------
   ▼▼▼ PARA AGREGAR UN RECURSO NUEVO (futuras actualizaciones) ▼▼▼
   Añade una entrada a la lista REGISTRO con:
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
                   tipo "texto"|"area"|"num"|"sino"|"opcion"|"lineas"|"json"
                   req  true = obligatorio (se marca con ●)
                   ops  opciones (para tipo "opcion")
                   def  valor por defecto
                   ej   placeholder / ejemplo
     aOpciones(valores, ctx)  → objeto de opciones para la llamada
                 REAL (ctx.perfil, ctx.clase, ctx.tipo ya vienen listos)
     aCodigo(valores, ctx)    → (opcional) el MISMO objeto pero para
                 el código generado (usa {__raw:true, codigo:"perfil"}).
                 Si falta, se usa aOpciones() tal cual.
     montaLista true → la función NO recibe `contenedor`: devuelve un
                 controlador con .elemento (o una lista de elementos)
                 que hay que agregar al bloque.
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

const REGISTRO = [
  /* ------------------- COMPONENTES ------------------- */

  {
    id: "aviso",
    nombre: "Aviso destacado",
    cat: "componentes",
    archivo: "componentes/aviso.js",
    imports: ["crearAviso"],
    funcion: "crearAviso",
    descripcion: "Caja de colores para lo importante (info, éxito, advertencia, error).",
    params: [
      { k: "texto", et: "Texto", tipo: "area", req: true, ej: "El examen se ve **una sola vez**." },
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
  },

  {
    id: "calendario",
    nombre: "Calendario del mes",
    cat: "visuales",
    archivo: "../recursos/js/visuales/calendario.js",
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
      { k: "festividades", et: "Festividades (una por línea: día | nombre)", tipo: "lineas", ej: "15 | Día de la Independencia" },
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
  },

  {
    id: "cita",
    nombre: "Cita o frase",
    cat: "componentes",
    archivo: "componentes/cita.js",
    imports: ["crearCita"],
    funcion: "crearCita",
    descripcion: "Frase destacada con barra morada; admite autor y fuente.",
    params: [
      { k: "texto", et: "Cita", tipo: "area", req: true, ej: "Las matemáticas son la poesía de las ciencias." },
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
  },

  {
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
  },

  {
    id: "detalles",
    nombre: "Contenido desplegable",
    cat: "componentes",
    archivo: "componentes/detalles.js",
    imports: ["crearDetalles"],
    funcion: "crearDetalles",
    descripcion: "Caja plegable: rótulo visible + contenido oculto (soluciones, glosario).",
    params: [
      { k: "titulo", et: "Rótulo", tipo: "texto", req: true, ej: "Ver la solución" },
      { k: "contenido", et: "Contenido oculto (un párrafo por línea)", tipo: "area", req: true, ej: "Paso 1: cuenta de 5 en 5…\nPaso 2: resta el total…" },
      { k: "abierto", et: "Arrancar abierto", tipo: "sino" },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      titulo: v.titulo || "",
      contenido: lineas(v.contenido),
      abierto: bool(v.abierto),
      tamano: num(v.tamano),
    }),
  },

  {
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
  },

  {
    id: "enlace",
    nombre: "Enlace / botón",
    cat: "componentes",
    archivo: "componentes/enlace.js",
    imports: ["crearEnlace"],
    funcion: "crearEnlace",
    descripcion: "Link a otra clase, Drive, video o PDF (texto o botón morado).",
    params: [
      { k: "texto", et: "Texto visible", tipo: "texto", req: true, ej: "Hoja de trabajo (PDF)" },
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
  },

  {
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
  },

  {
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
  },

  {
    id: "formatoTexto",
    nombre: "Texto con formato",
    cat: "componentes",
    archivo: "componentes/formatoTexto.js",
    imports: ["crearFormatoTexto"],
    funcion: "crearFormatoTexto",
    descripcion: "Texto libre con TODAS las marcas: **negrita**, $fórmulas$, {{color}}…",
    params: [
      { k: "texto", et: "Texto (con marcas)", tipo: "area", req: true, ej: "El agua es H~2~O y el **sulfato** es ==peligroso==. $x^2+1$" },
      { k: "tamano", et: "Tamaño (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),
  },

  {
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
  },

  {
    id: "lista",
    nombre: "Lista con viñetas",
    cat: "componentes",
    archivo: "componentes/lista.js",
    imports: ["crearLista"],
    funcion: "crearLista",
    descripcion: "Viñetas o numerada; cada elemento admite párrafo y sublistas (JSON).",
    params: [
      { k: "items", et: "Elementos (JSON o una línea c/u)", tipo: "area", req: true, ej: '["Las manecillas: **hora** y **minuto**.", {"texto": "La hora en punto", "parrafo": "El minutero apunta al 12.", "sublista": ["En punto", "Y media"]}]' },
      { k: "tipo", et: "Tipo", tipo: "opcion", ops: ["vineta", "numerada"], def: "vineta" },
      { k: "tamano", et: "Tamaño del texto (px)", tipo: "num" },
    ],
    aOpciones: (v) => ({
      items: listaMixta(v.items).valor || [],
      tipo: v.tipo || "vineta",
      tamano: num(v.tamano),
    }),
  },

  {
    id: "parrafo",
    nombre: "Párrafo",
    cat: "componentes",
    archivo: "componentes/parrafo.js",
    imports: ["crearParrafo"],
    funcion: "crearParrafo",
    descripcion: "Párrafo normal con todo el formato del proyecto.",
    params: [
      { k: "texto", et: "Texto", tipo: "area", req: true, ej: "El **minuto** es la manecilla *larga*." },
      { k: "tamano", et: "Tamaño (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),
  },

  {
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
  },

  {
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
  },

  {
    id: "subtitulo",
    nombre: "Subtítulo",
    cat: "componentes",
    archivo: "componentes/subtitulo.js",
    imports: ["crearSubtitulo"],
    funcion: "crearSubtitulo",
    descripcion: "Encabezado por nivel: orden 1 (h2)… orden 6 (el más pequeño).",
    params: [
      { k: "texto", et: "Texto", tipo: "texto", req: true, ej: "1 · La hora en punto" },
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
  },

  {
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
  },

  {
    id: "tabla",
    nombre: "Tabla",
    cat: "componentes",
    archivo: "componentes/tabla.js",
    imports: ["crearTabla"],
    funcion: "crearTabla",
    descripcion: "Tabla con filas/columnas y soporte de rowspan y colspan (JSON).",
    params: [
      { k: "contenido", et: "Contenido (matriz JSON)", tipo: "area", req: true, ej: '[["Figura", "Lados"], [{"texto": "Cuadrado", "rowspan": 1}, "4"]]' },
      { k: "titulo", et: "Título (caption)", tipo: "texto" },
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
  },

  {
    id: "titulo",
    nombre: "Título",
    cat: "componentes",
    archivo: "componentes/titulo.js",
    imports: ["crearTitulo"],
    funcion: "crearTitulo",
    descripcion: "Título principal del documento (h1).",
    params: [
      { k: "texto", et: "Texto", tipo: "texto", req: true, ej: "El reloj y el calendario" },
      { k: "tamano", et: "Tamaño (px)", tipo: "num" },
      { k: "alineacion", et: "Alineación", tipo: "opcion", ops: OPS_ALINEACION },
    ],
    aOpciones: (v) => ({
      texto: v.texto || "",
      tamano: num(v.tamano),
      alineacion: v.alineacion || undefined,
    }),
  },

  /* ---------------------- UTILS ---------------------- */

  {
    id: "blank",
    nombre: "blank — Completar espacios",
    cat: "utils",
    archivo: "utils/blank.js",
    imports: ["blank"],
    funcion: "blank",
    descripcion: "Texto con huecos [[respuesta]]; al enviar marca buenos/malos.",
    params: [
      { k: "texto", et: "Texto con marcas [[respuesta]] o ___", tipo: "area", req: true, ej: "El agua hierve a [[100]] °C y el símbolo del hierro es ___." },
      { k: "respuestas", et: "Respuestas de los ___ (una por línea, en orden)", tipo: "lineas", ej: "Fe\nAu" },
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
  },

  {
    id: "crucigrama",
    nombre: "crucigrama — Crucigrama",
    cat: "utils",
    archivo: "utils/crucigrama.js",
    imports: ["crucigrama"],
    funcion: "crucigrama",
    descripcion: "Crucigrama único por estudiante con nota al completarlo.",
    params: [
      { k: "palabras", et: "Palabras (una por línea: PALABRA | pista)", tipo: "area", req: true, ej: "ELEFANTE | El animal terrestre más grande\nGATO | Maúlla y ronronea" },
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
  },

  {
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
  },

  {
    id: "multipleOpcion",
    nombre: "multipleOpcion — Selección múltiple",
    cat: "utils",
    archivo: "utils/multipleOpcion.js",
    imports: ["multipleOpcion"],
    funcion: "multipleOpcion",
    descripcion: "Marca VARIAS opciones y envía (1 o más correctas).",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, ej: "Marca todos los números pares." },
      { k: "opciones", et: "Opciones (una por línea, 4–10)", tipo: "area", req: true, ej: "2\n3\n4\n7" },
      { k: "correctas", et: "Números de las correctas (1 = primera)", tipo: "texto", req: true, ej: "1, 3" },
      { k: "puntaje", et: "Puntaje del bloque (0–10)", tipo: "num", def: 1 },
      { k: "penalizarErroneas", et: "Las equivocadas restan", tipo: "sino", def: true },
      { k: "mostrarCorrectas", et: "Revelar correctas al enviar (solo examen)", tipo: "sino" },
      paramColumnas(),
      { k: "id", et: "id estable (opcional)", tipo: "texto" },
    ],
    aOpciones: (v, ctx) => ({
      indicacion: v.indicacion || "",
      opciones: lineas(v.opciones),
      correctas: lineas(String(v.correctas || "").replace(/,/g, " ")).map(Number).filter(Number.isFinite),
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
      correctas: lineas(String(v.correctas || "").replace(/,/g, " ")).map(Number).filter(Number.isFinite),
      puntaje: num(v.puntaje) ?? 1,
      penalizarErroneas: bool(v.penalizarErroneas, true),
      mostrarCorrectas: bool(v.mostrarCorrectas) || undefined,
      columnas: num(v.columnas),
      id: v.id || undefined,
      tipo: ctx.tipo,
      perfil: PERFIL_RAW,
      clase: CLASE_RAW,
    }),
  },

  {
    id: "opcionMultiple",
    nombre: "opcionMultiple — Opción múltiple",
    cat: "utils",
    archivo: "utils/opcionMultiple.js",
    imports: ["opcionMultiple"],
    funcion: "opcionMultiple",
    descripcion: "Pregunta con UNA respuesta correcta entre 2 y 6 opciones.",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, ej: "¿Cuánto es $\\frac{3}{4} + \\frac{1}{4}$?" },
      { k: "respuestas", et: "Respuestas (una por línea, 2–6)", tipo: "area", req: true, ej: "$\\frac{4}{8}$\n$\\frac{1}{2}$\n1\n$\\frac{3}{8}$" },
      { k: "respuestaCorrecta", et: "Número de la correcta (1 = primera)", tipo: "num", req: true, ej: "2" },
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
  },

  {
    id: "ordenar",
    nombre: "ordenar — Ordenar objetos",
    cat: "utils",
    archivo: "utils/ordenar.js",
    imports: ["ordenar"],
    funcion: "ordenar",
    descripcion: "Arrastrar objetos a los campos numerados, en su orden correcto.",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, ej: "Ordena de MENOR a MAYOR." },
      { k: "lista", et: "Objetos EN ORDEN correcto (una por línea, 3–10)", tipo: "area", req: true, ej: "-2\n$\\frac{1}{4}$\n$\\frac{1}{2}$\n5" },
      { k: "distractores", et: "Distractores (0–8, no van en ningún campo)", tipo: "area", ej: "$\\sqrt{2}$" },
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
  },

  {
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
  },

  {
    id: "relacionar",
    nombre: "relacionar — Relacionar columnas",
    cat: "utils",
    archivo: "utils/relacionar.js",
    imports: ["relacionar"],
    funcion: "relacionar",
    descripcion: "Dos columnas: forma parejas con clic y envía (imágenes y $fórmulas$).",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, ej: "Relaciona cada figura con su área." },
      { k: "izquierda", et: "Columna izquierda (una por línea, 3–10)", tipo: "area", req: true, ej: "Triángulo\nCírculo\nRectángulo" },
      { k: "derecha", et: "Columna derecha (en el MISMO orden correcto)", tipo: "area", req: true, ej: "$\\frac{b \\cdot h}{2}$\n$\\pi r^2$\n$b \\cdot h$" },
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
  },

  {
    id: "respuestaSimple",
    nombre: "respuestaSimple — Respuesta simple",
    cat: "utils",
    archivo: "utils/respuestaSimple.js",
    imports: ["respuestaSimple"],
    funcion: "respuestaSimple",
    descripcion: "Campo de texto o fórmula; acepta listas de equivalentes.",
    params: [
      { k: "indicacion", et: "Indicación", tipo: "area", req: true, ej: "¿Quién escribió El Quijote?" },
      { k: "respuestas", et: "Respuestas (una por campo; «a | b» = equivalentes)", tipo: "area", req: true, ej: "Miguel de Cervantes\nFe | hierro" },
      { k: "etiquetas", et: "Etiquetas de los campos (opcional)", tipo: "area", ej: "Autor\nSímbolo" },
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
  },

  {
    id: "sopaLetras",
    nombre: "sopaLetras — Sopa de letras",
    cat: "utils",
    archivo: "utils/sopaLetras.js",
    imports: ["sopaLetras"],
    funcion: "sopaLetras",
    descripcion: "Sopa de letras única por estudiante con nota al completarla.",
    params: [
      { k: "palabras", et: "Palabras (una por línea, 2–12)", tipo: "area", req: true, ej: "GATO\nPERRO\nCONEJO\nRATÓN" },
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
  },

  {
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
  },

  {
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
  },

  {
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
  },

  /* --------------------- VISUALES --------------------- */

  {
    id: "reloj",
    nombre: "Reloj de pared",
    cat: "visuales",
    archivo: "../recursos/js/visuales/reloj.js",
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
  },
];

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
  try { url = new URL(urlBase, RAIZ_JS); } catch (e) { return null; }
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

    /* ---------- celular: las 3 divisiones se apilan ---------- */
    @media (max-width: 900px) {
      .crear-vista { height: auto; min-height: 0; }
      .crear-cuerpo { flex-direction: column; }
      .crear-izquierda { width: auto; min-width: 0; border-right: none; border-bottom: 1px solid #e5e7eb; }
      .crz-lista { max-height: 40dvh; }
      .crear-centro { overflow: visible; }
      .crear-derecha { width: auto; min-width: 0; border-left: none; border-top: 1px solid #e5e7eb; }
      .cv-cuerpo { overflow: visible; }
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

    campo.dataset.k = p.k;
    campo.addEventListener("input", () => {
      b.valores[p.k] = campo.value;
      campo.classList.remove("error");
      guardarBorrador();
    });

    envoltura.appendChild(campo);
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
  (r.params || []).forEach((p) => {
    if (!p.req) return;
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
        const c = form.querySelector('[data-k="' + k + '"]');
        if (c) c.classList.add("error");
      });
    }
    notify("Faltan campos obligatorios (●) en «" + r.nombre + "».", "warning");
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
    if (cambio) {
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
