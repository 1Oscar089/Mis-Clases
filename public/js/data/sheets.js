// ============================================================
// sheets.js — TODO lo que se dibuja en la hoja de cálculo
//             (js/data/sheets.js) · v2
//
// ESTRUCTURA DEL CUADERNO (v2):
//   · HOJA 1 = «Índice» — un enlace a cada hoja (se reconstruye sola
//     en cada configurar; de primero entre las hojas de la app).
//   · «Asistencia» — UNA sola hoja con TODOS los estudiantes de TODOS
//     los grados, en filas hacia abajo (ordenados por grado y por
//     apellidos: nombre(2) nombre(3) nombre(0)); columnas NIE,
//     Estudiante, Grado y una columna por FECHA donde el módulo de
//     asistencia (más adelante) pondrá + asistió · − falta · P permiso.
//   · «Notas-{materia}-{grado}» (una por grado-materia) — los
//     estudiantes igual que en Asistencia (filas hacia abajo),
//     SEPARADOS EN TRES TABLAS: CLASES → TAREAS → EXÁMENES. Cada
//     actividad es una columna que indica de cuál es y de qué día:
//     clases «D{día}·U{u}·L{l}» · tareas/exámenes «T/E D{día}·U·L título».
//     CLASES lleva además Σ (nota final) y Media.
//
// FILOSOFÍA: code.gs es un MOTOR GENÉRICO que nunca se vuelve a
// tocar. Cada hoja, columna, fórmula, color, ancho y validación
// de Google Sheets queda definido AQUÍ, en CONFIG y en los
// constructores de abajo. ¿Quieres cambiar la hoja mañana?
// Cambias este archivo y el motor la redibuja: NADA más.
//
// Ningún módulo fuera de db.js debe importar este archivo
// (regla del proyecto: la UI habla con db.js y db.js habla con
// Firestore y con Sheets).
//
// INSTALACIÓN (una sola vez):
//   1. code.gs → hoja de cálculo → Extensiones → Apps Script →
//      pegar → cambiar TOKEN → Implementar como App web
//      (ejecutar como: yo · acceso: cualquier persona).
//   2. Copiar el enlace /exec y pegarlo en CONFIG.url (abajo).
//   3. Poner en CONFIG.token la MISMA cadena secreta de code.gs.
//
// Peticiones: POST text/plain (evita el preflight CORS de Apps
// Script); si el POST falla, las acciones de SOLO LECTURA
// reintentan por GET-JSONP. Timeout por defecto 8 s (configurar
// 30 s: dibujar hojas tarda más). TODO es "mejor esfuerzo":
// estas funciones NUNCA lanzan; devuelven {ok:false, razon}.
// ============================================================

/* ════════════════════ 1. CONFIGURACIÓN ════════════════════
   Lo ÚNICO que se edita a mano: url + token para instalar;
   lo demás cuando quieras cambiar el aspecto de las hojas. */

const CONFIG = {
  // ⬇️⬇️  PEGA AQUÍ EL ENLACE /exec DEL WEB APP  ⬇️⬇️
  url: "",
  // La MISMA cadena secreta que TOKEN en code.gs:
  token: "CAMBIA-ESTA-CADENA-SECRETA",

  timeoutMs: 8000,            // peticiones normales
  timeoutConfigurarMs: 30000, // configurar redibuja hojas enteras

  // Sube estas cifras cuando quieras REDIBUJAR una hoja desde
  // cero con la estructura nueva (borra los datos de ESA hoja):
  versionNotas: 2,       // v2: estudiantes en filas · tablas CLASES→TAREAS→EXÁMENES
  versionAsistencia: 2,  // v2: UNA hoja «Asistencia» con todos los grados

  // Formatos de número (sintaxis de hoja):
  formatoNota: "0.##",  // notas con decimales sin ceros de más
  formatoTexto: "@",    // NIEs e IDs como texto (conserva ceros a la izquierda)
  minNota: 0,
  maxNota: 10,

  // Anchuras (px):
  anchoNIE: 90,
  anchoNombre: 220,
  anchoGrado: 130,     // columna Grado en Asistencia
  anchoNota: 64,       // columnas de notas/días
  anchoFecha: 96,      // columnas de fecha en Asistencia
  anchoTotal: 56,      // columna Σ
  anchoMedia: 70,      // columnas Media

  // ETIQUETAS (lo que se ve en los encabezados). Son también la
  // CLAVE con la que el motor busca cada columna: si las cambias,
  // las columnas viejas quedan huérfanas (mejor subir version*).
  etiquetaFecha: (iso) => String(iso || ""),
  etiquetaClase: (c) =>
    "D" + (c?.dia ?? "?") + "·U" + (c?.unidad ?? "?") + "·L" + (c?.leccion ?? "?"),
  // Tarea o examen como COLUMNA: dice de cuál es y de qué día. El
  // MISMO cálculo corre al configurar la hoja y al reportar una
  // nota → la columna siempre se encuentra.
  etiquetaActividad: (a, letra) => {
    const p = [];
    if (a?.dia != null && a.dia !== "") p.push("D" + a.dia);
    if (a?.unidad != null && a.unidad !== "") p.push("U" + a.unidad);
    if (a?.leccion != null && a.leccion !== "") p.push("L" + a.leccion);
    const titulo = String(a?.titulo ?? a?.clase ?? "").trim().slice(0, 32);
    return (letra ? letra + " " : "") + (p.length ? p.join("·") + " " : "") + titulo;
  },
  tituloNotas: (materia, grado) => "NOTAS · " + materia + " · " + grado + "°",

  // HOJA 1: índice con un enlace a cada hoja (el motor lo rellena
  // y lo reconstruye solo en cada configurar).
  menu: { hoja: "Índice", titulo: "Mis Clases Online · Índice" },

  // Asistencia: valores permitidos (+ asistió · − falta · P permiso)
  estados: ["+", "-", "P"],

  // Nombres de los grados (igual que auth.js; aquí son presentación)
  grados: [
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
  ],

  // Fórmulas de Σ y Media. TRUCO: usan COLUMN()-1 → el rango
  // termina SIEMPRE en la columna anterior a la de la propia
  // fórmula, así siguen siendo correctas aunque se inserten
  // columnas nuevas. {f} lo sustituye el motor por la fila.
  formulaSuma:
    '=IF(COUNT($C{f}:INDEX({f}:{f},1,COLUMN()-1))=0,"",' +
    "SUM($C{f}:INDEX({f}:{f},1,COLUMN()-1)))",
  formulaMedia:
    '=IF(COUNT($C{f}:INDEX({f}:{f},1,COLUMN()-1))=0,"",' +
    "ROUND(SUM($C{f}:INDEX({f}:{f},1,COLUMN()-1))/" +
    "COUNT($C{f}:INDEX({f}:{f},1,COLUMN()-1)),1))",
};

/* Paleta del proyecto (blanco + morado; asistencia en naranja). */
const ESTILOS = {
  titulo: { negrita: true, tamano: 14, color: "#5b21b6" },
  seccion: { negrita: true, tamano: 11, color: "#6d28d9", fondo: "#ede9fe" },
  cab: { negrita: true, color: "#ffffff", fondo: "#7c3aed", centrado: "center", vertical: "middle", borde: "caja" },
  cabAsistencia: { negrita: true, color: "#9a3412", fondo: "#ffedd5", centrado: "center", vertical: "middle", borde: "caja" },
  cabFecha: { negrita: true, color: "#9a3412", fondo: "#ffedd5", centrado: "center", vertical: "middle", borde: "caja" },
  celdas: { borde: "todos", vertical: "middle" },
  enlace: { tamano: 11, color: "#374151" },
  fin: { tamano: 8, color: "#c7cbe0", italica: true }, // marcador «FIN» (casi invisible)
};

const REGLAS_MEDIA = [
  { cuando: "menor", valor: 6, fondo: "#fee2e2", color: "#991b1b" },
  { cuando: "mayorIgual", valor: 8, fondo: "#dcfce7", color: "#166534" },
];

const REGLAS_ESTADO = [
  { cuando: "texto", valor: "+", fondo: "#dcfce7", color: "#166534" }, // Asistió
  { cuando: "texto", valor: "P", fondo: "#fef9c3", color: "#854d0e" }, // Permiso
  { cuando: "texto", valor: "-", fondo: "#fee2e2", color: "#991b1b" }, // Falta
];

/* ════════════════════ 2. AYUDANTES ════════════════════ */

function colALetra(n) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Apellidos = palabras [2] y [3] del nombre IGNORANDO de/del/la/las/los
// (convención validada del proyecto). Desempata con los nombres.
const ARTICULOS = new Set(["de", "del", "la", "las", "los"]);
function claveApellidos(nombre) {
  const partes = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter((p) => !ARTICULOS.has(p.toLowerCase()));
  return ((partes[2] || "") + " " + (partes[3] || "") + " " + (partes[0] || "")).toLowerCase();
}
/** Orden de la app: por GRADO (asc) y dentro por apellidos —
 *  nombre(2) nombre(3) nombre(0) — igual en Asistencia y en las
 *  hojas de notas. Sin grado → al final. */
function ordenEstudiantes(lista) {
  return (lista || [])
    .slice()
    .sort((a, b) => {
      const ga = a?.grado == null || a.grado === "" ? 9999 : Number(a.grado);
      const gb = b?.grado == null || b.grado === "" ? 9999 : Number(b.grado);
      if (ga !== gb) return ga - gb;
      return claveApellidos(a.nombre).localeCompare(claveApellidos(b.nombre), "es");
    });
}

// Nombre del grado para la columna Grado de Asistencia
function gradoTexto(id) {
  const g = CONFIG.grados.find((x) => x.id === Number(id));
  if (g) return g.nombre;
  return id == null || id === "" ? "" : String(id) + "°";
}

// UNA sola hoja de asistencia para TODOS los grados (v2)
const nombreAsistencia = () => "Asistencia";
const nombreNotas = (materia, grado) => "Notas-" + String(materia) + "-" + String(grado);

/* ════════════════════ 3. CONSTRUCTORES DE HOJAS ════════════════════
   Cada "spec" es la foto declarativa de una hoja. Las posiciones
   dinámicas van como MARCAS ({col,valor,desplazar,respaldo}) para que
   el motor las re-ubique solo aunque las tablas hayan crecido. */

/* Hoja 1 «Índice»: el motor la crea primero y _menu la rellena con
   un enlace por cada hoja visible (se reconstruye en cada llamada). */
function specIndice() {
  return {
    nombre: CONFIG.menu.hoja,
    version: 1,
    maxFilas: 80,
    maxColumnas: 4,
    anchos: { A: 300 },
  };
}

/* Hoja «Asistencia» — UNA sola para todos los grados.
   A=NIE · B=Estudiante · C=Grado · [una columna por FECHA con
   + asistió · − falta · P permiso (la pone el módulo de asistencia)].
   Filas hacia abajo: TODOS los niños, ordenados por grado y por
   apellidos (nombre(2) nombre(3) nombre(0)). */
function specAsistencia(estudiantes) {
  const filas = ordenEstudiantes(estudiantes);
  const ne = filas.length;
  const maxFilas = Math.max(80, ne + 40);
  const finDatos = Math.max(ne + 1, 2);
  return {
    nombre: nombreAsistencia(),
    version: CONFIG.versionAsistencia,
    maxFilas,
    maxColumnas: 60,
    congelar: { fila: 1, col: 3 },
    cabeceras: [{ fila: 1, valores: ["NIE", "Estudiante", "Grado"] }],
    filasIniciales: [
      {
        fila: 2,
        valores: filas.map((e) => [String(e.nie), e.nombre, gradoTexto(e.grado)]),
      },
    ],
    anchos: { A: CONFIG.anchoNIE, B: CONFIG.anchoNombre, C: CONFIG.anchoGrado },
    formatos: [
      { rango: { desde: { fila: 2, col: 1 }, hasta: { fila: maxFilas - 10, col: 1 } }, patron: CONFIG.formatoTexto },
    ],
    validaciones: [
      { rango: { desde: { fila: 2, col: 4 }, hasta: { fila: maxFilas - 10, col: 50 } }, opciones: CONFIG.estados, estricta: false },
    ],
    condicionales: [
      { rango: { desde: { fila: 2, col: 4 }, hasta: { fila: maxFilas - 10, col: 50 } }, reglas: REGLAS_ESTADO },
    ],
    estilos: [
      { rango: { fila: 1, col: 1, filas: 1, cols: 3 }, estilo: ESTILOS.cabAsistencia },
      { rango: { desde: { fila: 1, col: 4 }, hasta: { fila: 1, col: 50 } }, estilo: ESTILOS.cabFecha },
      { rango: { desde: { fila: 2, col: 1 }, hasta: { fila: finDatos, col: 50 } }, estilo: ESTILOS.celdas },
    ],
  };
}

/* Hoja Notas-{materia}-{grado} (v2): los estudiantes IGUAL que en
   Asistencia — filas hacia abajo (NIE · Estudiante) — y TRES tablas
   apiladas donde cada actividad es una COLUMNA que dice de cuál es
   y de qué día:
     CLASES:   cab = NIE · Estudiante · [D{día}·U·L ×clases] · Σ · Media
     TAREAS:   cab = NIE · Estudiante · [T D{día}·U·L título ×tareas] · Media
     EXÁMENES: cab = NIE · Estudiante · [E D{día}·U·L título ×examenes] · Media
   El marcador «FIN» cierra la última tabla por abajo (permite
   insertar filas y reordenar con límites exactos). */
function specNotas({ materia, grado, estudiantes, clases = [], examenes = [], tareas = [] }) {
  const alus = ordenEstudiantes(estudiantes);
  const ne = alus.length, nc = clases.length, nx = examenes.length, nt = tareas.length;

  // ── Filas base (posición al CREAR; después el motor usa marcas) ──
  const fSecCl = 3, fCabCl = 4, fAluCl = 5;
  const fFinCl = fAluCl + ne - 1;              // último alumno de CLASES
  const fSecTa = fFinCl + 2, fCabTa = fSecTa + 1, fAluTa = fCabTa + 1;
  const fFinTa = fAluTa + ne - 1;
  const fSecEx = fFinTa + 2, fCabEx = fSecEx + 1, fAluEx = fCabEx + 1;
  const fFinEx = fAluEx + ne - 1;
  const fFin = fFinEx + 2;                     // marcador «FIN»

  // ── Marcas que se autoubican (respaldo = posición al crear) ──
  const mCabTa = { col: 1, valor: "TAREAS", desplazar: 1, respaldo: fCabTa };
  const mCabEx = { col: 1, valor: "EXÁMENES", desplazar: 1, respaldo: fCabEx };
  const mIniTa = { col: 1, valor: "TAREAS", desplazar: 2, respaldo: fAluTa };
  const mIniEx = { col: 1, valor: "EXÁMENES", desplazar: 2, respaldo: fAluEx };
  const mFinTa = { col: 1, valor: "EXÁMENES", desplazar: -2, respaldo: fFinTa };
  const mFinCl = { col: 1, valor: "TAREAS", desplazar: -2, respaldo: fFinCl };
  const mFinBlq = { col: 1, valor: "FIN", desplazar: -1, respaldo: fFinEx };

  // ── Columnas clave (por marca: siempre correctas aunque crezcan) ──
  const colSuma = 3 + nc, colMediaCl = 4 + nc, colMediaTa = 3 + nt, colMediaEx = 3 + nx;
  const mSuma = { fila: fCabCl, valor: "Σ", respaldo: colSuma };
  const mMediaCl = { fila: fCabCl, valor: "Media", respaldo: colMediaCl };
  const mMediaTa = { fila: mCabTa, valor: "Media", respaldo: colMediaTa };
  const mMediaEx = { fila: mCabEx, valor: "Media", respaldo: colMediaEx };

  const anchos = { A: CONFIG.anchoNIE, B: CONFIG.anchoNombre };
  const maxDatos = Math.max(2 + nc, 2 + nt, 2 + nx);
  for (let i = 3; i <= maxDatos; i++) anchos[colALetra(i)] = CONFIG.anchoNota;
  anchos[colALetra(colSuma)] = CONFIG.anchoTotal;
  anchos[colALetra(colMediaCl)] = CONFIG.anchoMedia;
  anchos[colALetra(Math.max(colMediaTa, colMediaEx))] = CONFIG.anchoMedia;

  const plantillas = [];
  if (ne > 0) {
    plantillas.push(
      { col: mSuma, filaInicio: fAluCl, filaFin: mFinCl, texto: CONFIG.formulaSuma },
      { col: mMediaCl, filaInicio: fAluCl, filaFin: mFinCl, texto: CONFIG.formulaMedia },
      { col: mMediaTa, filaInicio: mIniTa, filaFin: mFinTa, texto: CONFIG.formulaMedia },
      { col: mMediaEx, filaInicio: mIniEx, filaFin: mFinBlq, texto: CONFIG.formulaMedia },
    );
  }

  return {
    nombre: nombreNotas(materia, grado),
    version: CONFIG.versionNotas,
    maxFilas: fFin + 40,
    maxColumnas: Math.max(colMediaCl, colMediaTa, colMediaEx) + 8,
    congelar: { fila: 1, col: 2 },
    cabeceras: [
      { fila: 1, valores: [CONFIG.tituloNotas(materia, grado)] },
      { fila: fSecCl, valores: ["CLASES"] },
      { fila: fCabCl, valores: ["NIE", "Estudiante", ...clases.map((c) => CONFIG.etiquetaClase(c)), "Σ", "Media"], soloAlCrear: true },
      { fila: fSecTa, valores: ["TAREAS"] },
      { fila: fCabTa, valores: ["NIE", "Estudiante", ...tareas.map((t) => CONFIG.etiquetaActividad(t, "T")), "Media"], soloAlCrear: true },
      { fila: fSecEx, valores: ["EXÁMENES"] },
      { fila: fCabEx, valores: ["NIE", "Estudiante", ...examenes.map((x) => CONFIG.etiquetaActividad(x, "E")), "Media"], soloAlCrear: true },
      { fila: fFin, valores: ["FIN"] },
    ],
    filasIniciales: [
      { fila: fAluCl, valores: alus.map((e) => [String(e.nie), e.nombre]) },
      { fila: fAluTa, valores: alus.map((e) => [String(e.nie), e.nombre]) },
      { fila: fAluEx, valores: alus.map((e) => [String(e.nie), e.nombre]) },
    ].filter((b) => b.valores.length),
    anchos,
    plantillas,
    formatos: [
      { rango: { desde: { fila: fAluCl, col: 1 }, hasta: { fila: mFinCl, col: 1 } }, patron: CONFIG.formatoTexto },
      { rango: { desde: { fila: mIniTa, col: 1 }, hasta: { fila: mFinTa, col: 1 } }, patron: CONFIG.formatoTexto },
      { rango: { desde: { fila: mIniEx, col: 1 }, hasta: { fila: mFinBlq, col: 1 } }, patron: CONFIG.formatoTexto },
      { rango: { desde: { fila: fAluCl, col: 3 }, hasta: { fila: mFinCl, col: mUltDe(mSuma) } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: mIniTa, col: 3 }, hasta: { fila: mFinTa, col: mUltDe(mMediaTa) } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: mIniEx, col: 3 }, hasta: { fila: mFinBlq, col: mUltDe(mMediaEx) } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: fAluCl, col: mSuma }, hasta: { fila: mFinCl, col: mMediaCl } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: mIniTa, col: mMediaTa }, hasta: { fila: mFinTa, col: mMediaTa } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: mIniEx, col: mMediaEx }, hasta: { fila: mFinBlq, col: mMediaEx } }, patron: CONFIG.formatoNota },
    ],
    validaciones: [
      { rango: { desde: { fila: fAluCl, col: 3 }, hasta: { fila: mFinCl, col: mUltDe(mSuma) } }, tipo: "numero", min: CONFIG.minNota, max: CONFIG.maxNota, estricta: false },
      { rango: { desde: { fila: mIniTa, col: 3 }, hasta: { fila: mFinTa, col: mUltDe(mMediaTa) } }, tipo: "numero", min: CONFIG.minNota, max: CONFIG.maxNota, estricta: false },
      { rango: { desde: { fila: mIniEx, col: 3 }, hasta: { fila: mFinBlq, col: mUltDe(mMediaEx) } }, tipo: "numero", min: CONFIG.minNota, max: CONFIG.maxNota, estricta: false },
    ],
    condicionales: [
      { rango: { desde: { fila: fAluCl, col: mMediaCl }, hasta: { fila: mFinCl, col: mMediaCl } }, reglas: REGLAS_MEDIA },
      { rango: { desde: { fila: mIniTa, col: mMediaTa }, hasta: { fila: mFinTa, col: mMediaTa } }, reglas: REGLAS_MEDIA },
      { rango: { desde: { fila: mIniEx, col: mMediaEx }, hasta: { fila: mFinBlq, col: mMediaEx } }, reglas: REGLAS_MEDIA },
    ],
    estilos: [
      { rango: { fila: 1, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.titulo },
      { rango: { fila: fSecCl, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.seccion },
      { rango: { fila: fSecTa, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.seccion },
      { rango: { fila: fSecEx, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.seccion },
      { rango: { desde: { fila: fCabCl, col: 1 }, hasta: { fila: fCabCl, col: mMediaCl } }, estilo: ESTILOS.cab },
      { rango: { desde: { fila: fCabTa, col: 1 }, hasta: { fila: fCabTa, col: mMediaTa } }, estilo: ESTILOS.cab },
      { rango: { desde: { fila: fCabEx, col: 1 }, hasta: { fila: fCabEx, col: mMediaEx } }, estilo: ESTILOS.cab },
      { rango: { desde: { fila: fAluCl, col: 1 }, hasta: { fila: mFinCl, col: mMediaCl } }, estilo: ESTILOS.celdas },
      { rango: { desde: { fila: mIniTa, col: 1 }, hasta: { fila: mFinTa, col: mMediaTa } }, estilo: ESTILOS.celdas },
      { rango: { desde: { fila: mIniEx, col: 1 }, hasta: { fila: mFinBlq, col: mMediaEx } }, estilo: ESTILOS.celdas },
      { rango: { fila: fFin, col: 1, filas: 1, cols: 1 }, estilo: ESTILOS.fin },
    ],
  };
}

// Columna ANTERIOR a la de una marca de cabecera (última de notas)
function mUltDe(marca) {
  return { ...marca, desplazar: (marca.desplazar || 0) - 1 };
}

/* ════════════════════ 4. TRANSPORTE ════════════════════ */

const SOLO_LECTURA = ["ping", "leer", "info"];

export function configurada() {
  return /^https:\/\/script\.google\.com\/.+\/exec/.test(String(CONFIG.url).trim());
}

function jsonp(acciones) {
  return new Promise((resolver, rechazar) => {
    const cb = "mco_jsonp_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const limpiar = () => { try { delete window[cb]; } catch (x) { window[cb] = undefined; } script.remove(); };
    const timer = setTimeout(() => { limpiar(); rechazar(new Error("jsonp-tiempo")); }, CONFIG.timeoutMs);
    window[cb] = (datos) => { clearTimeout(timer); limpiar(); resolver(datos); };
    script.onerror = () => { clearTimeout(timer); limpiar(); rechazar(new Error("jsonp-red")); };
    script.src =
      CONFIG.url.trim() +
      "?token=" + encodeURIComponent(CONFIG.token) +
      "&acciones=" + encodeURIComponent(JSON.stringify(acciones)) +
      "&callback=" + cb;
    document.head.appendChild(script);
  });
}

/** Envía acciones al motor. NUNCA lanza: devuelve {ok, resultados} o {ok:false}. */
async function llamar(acciones, opciones = {}) {
  if (!configurada()) return { ok: false, razon: "sin-url" };
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), opciones.timeout || CONFIG.timeoutMs);
  try {
    const res = await fetch(CONFIG.url.trim(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: CONFIG.token, acciones }),
      signal: control.signal,
    });
    const texto = await res.text();
    try {
      return JSON.parse(texto);
    } catch (x) {
      return { ok: false, razon: "respuesta", detalle: String(texto).slice(0, 160) };
    }
  } catch (e) {
    if (acciones.every((a) => SOLO_LECTURA.includes(a.a))) {
      try { return await jsonp(acciones); } catch (y) { /* cae abajo */ }
    }
    return { ok: false, razon: "red", detalle: String((e && e.message) || e) };
  } finally {
    clearTimeout(timer);
  }
}

/* ════════════════════ 5. API DE DOMINIO ════════════════════
   Tres operaciones y dos de diagnóstico. Todas "mejor esfuerzo".
   Los constructores (acciones*) son puros → probables con Node. */

export async function ping() {
  const r = await llamar([{ a: "ping" }]);
  if (!r || !r.ok) return { ok: false, ...(r || {}), razon: (r && r.razon) || "red" };
  const p = (r.resultados || [])[0];
  return p && p.ok
    ? { ok: true, version: p.version, hora: p.hora }
    : { ok: false, razon: "motor", detalle: p && p.error };
}

export async function info() {
  const r = await llamar([{ a: "info" }]);
  if (!r || !r.ok) return { ok: false, ...(r || {}), razon: (r && r.razon) || "red" };
  return r.resultados[0] || { ok: false, razon: "motor" };
}

export async function leer(hoja) {
  const r = await llamar([{ a: "leer", hoja: String(hoja) }]);
  if (!r || !r.ok) return { ok: false, ...(r || {}), razon: (r && r.razon) || "red" };
  return r.resultados[0] || { ok: false, razon: "motor" };
}

/** Acciones para crear/sincronizar TODO el cuaderno (v2).
 *  datos: { estudiantes: [ { uid, nombre, nie, grado } ],   ← TODOS
 *           hojas: [ { grado, materia,                      ← una por
 *                     clases: [ { dia, unidad, leccion, clase } ],
 *                     examenes: [ { id, titulo, dia, unidad, leccion } ],
 *                     tareas:  [ { id, titulo, dia, unidad, leccion } ] } ] }
 *  Crea/actualiza: «Índice» (hoja 1) · «Asistencia» (todos los
 *  grados en una hoja) · «Notas-{materia}-{grado}» por cada entrada.
 *  Compatibilidad: si en vez de `hojas` llega la forma vieja
 *  { grado, materia, clases, examenes, tareas } con estudiantes de
 *  UN grado, se adapta sola. */
function accionesConfigurar(datos) {
  const d = datos || {};

  // ── Adaptar la forma vieja (una sola materia) si hiciera falta ──
  let estudiantes = d.estudiantes || [];
  let tablas = Array.isArray(d.hojas) ? d.hojas : null;
  if (!tablas && d.materia) {
    estudiantes = (estudiantes.length ? estudiantes : []).map((e) => ({
      ...e, grado: e.grado ?? d.grado,
    }));
    tablas = [{
      grado: d.grado, materia: d.materia,
      clases: d.clases || [], examenes: d.examenes || [], tareas: d.tareas || [],
    }];
  }
  if (!tablas || !tablas.length) throw new Error("nada-que-configurar");

  const todos = ordenEstudiantes(estudiantes);   // grado asc + apellidos
  const gradosVistos = [...new Set(
    todos.map((e) => Number(e.grado)).filter((g) => Number.isFinite(g))
  )];

  // ── Hojas: Índice (1.ª) + Asistencia (todos) + Notas por grado-materia ──
  const hojas = [specIndice()];
  if (todos.length) hojas.push(specAsistencia(todos));
  tablas.forEach((t) => {
    if (!t.materia) return;
    const delGrado = todos.filter((e) => Number(e.grado) === Number(t.grado));
    hojas.push(specNotas({
      materia: t.materia, grado: t.grado, estudiantes: delGrado,
      clases: t.clases || [], examenes: t.examenes || [], tareas: t.tareas || [],
    }));
  });

  const acciones = [{
    a: "configurar",
    hojas,
    // Limpieza del formato v1: menú viejo y asistencia por grado
    eliminar: ["Menú", ...gradosVistos.map((g) => "Asistencia-" + g)],
    menu: {
      hoja: CONFIG.menu.hoja,
      titulo: CONFIG.menu.titulo,
      estiloTitulo: ESTILOS.titulo,
      estiloEnlaces: ESTILOS.enlace,
    },
  }];

  // ── Por CADA hoja de notas: alumnado + actividades + orden + fórmulas ──
  tablas.forEach((t) => {
    if (!t.materia) return;
    const hoja = nombreNotas(t.materia, t.grado);
    const alus = ordenEstudiantes(todos.filter((e) => Number(e.grado) === Number(t.grado)));
    if (!alus.length) return;
    const orden = alus.map((e) => String(e.nie));

    // Alumnado en LAS TRES tablas (fila = idempotente: si ya está, no
    // toca). `desde` acota la búsqueda a SU bloque; se inserta ANTES
    // de la última fila del bloque (sección-2: conserva el hueco de
    // separación y deja los límites de reordenar siempre correctos).
    alus.forEach((e) => acciones.push({
      a: "fila", hoja, clave: String(e.nie), valores: [String(e.nie), e.nombre],
      desde: 5,
      insertar: { col: 1, valor: "TAREAS", desplazar: -2 },
      plantillas: [
        { col: { fila: 4, valor: "Σ" }, texto: CONFIG.formulaSuma },
        { col: { fila: 4, valor: "Media" }, texto: CONFIG.formulaMedia },
      ],
    }));
    alus.forEach((e) => acciones.push({
      a: "fila", hoja, clave: String(e.nie), valores: [String(e.nie), e.nombre],
      desde: { col: 1, valor: "TAREAS", desplazar: 2 },
      insertar: { col: 1, valor: "EXÁMENES", desplazar: -2 },
      plantillas: [{ col: mMediaCab("TAREAS"), texto: CONFIG.formulaMedia }],
    }));
    alus.forEach((e) => acciones.push({
      a: "fila", hoja, clave: String(e.nie), valores: [String(e.nie), e.nombre],
      desde: { col: 1, valor: "EXÁMENES", desplazar: 2 },
      insertar: { col: 1, valor: "FIN", desplazar: -2 },
      plantillas: [{ col: mMediaCab("EXÁMENES"), texto: CONFIG.formulaMedia }],
    }));

    // Clases como columnas de CLASES (antes de Σ)
    (t.clases || []).forEach((c) => acciones.push({
      a: "columna", hoja, filaClave: 4, clave: CONFIG.etiquetaClase(c),
      insertar: { fila: 4, valor: "Σ", desplazar: 0 },
      ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
    }));
    // Tareas y exámenes como columnas de SU tabla (antes de Media)
    (t.tareas || []).forEach((ta) => acciones.push({
      a: "columna", hoja, filaClave: mCabSeccion("TAREAS"),
      clave: CONFIG.etiquetaActividad(ta, "T"),
      insertar: { fila: mCabSeccion("TAREAS"), valor: "Media", desplazar: 0 },
      ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
    }));
    (t.examenes || []).forEach((x) => acciones.push({
      a: "columna", hoja, filaClave: mCabSeccion("EXÁMENES"),
      clave: CONFIG.etiquetaActividad(x, "E"),
      insertar: { fila: mCabSeccion("EXÁMENES"), valor: "Media", desplazar: 0 },
      ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
    }));

    // Ordenar alumnado (por apellidos) en las TRES tablas y re-estampar
    // Σ/Media (reordenar reescribe valores y mata las fórmulas):
    acciones.push(
      { a: "reordenar", hoja, desde: 5, hasta: { col: 1, valor: "TAREAS", desplazar: -2 }, colClave: 1, orden },
      { a: "reordenar", hoja, desde: { col: 1, valor: "TAREAS", desplazar: 2 }, hasta: { col: 1, valor: "EXÁMENES", desplazar: -2 }, colClave: 1, orden },
      { a: "reordenar", hoja, desde: { col: 1, valor: "EXÁMENES", desplazar: 2 }, hasta: { col: 1, valor: "FIN", desplazar: -1 }, colClave: 1, orden },
      {
        a: "plantillas", hoja,
        plantillas: [
          { col: { fila: 4, valor: "Σ" }, filaInicio: 5, filaFin: { col: 1, valor: "TAREAS", desplazar: -2 }, texto: CONFIG.formulaSuma },
          { col: { fila: 4, valor: "Media" }, filaInicio: 5, filaFin: { col: 1, valor: "TAREAS", desplazar: -2 }, texto: CONFIG.formulaMedia },
          { col: mMediaCab("TAREAS"), filaInicio: { col: 1, valor: "TAREAS", desplazar: 2 }, filaFin: { col: 1, valor: "EXÁMENES", desplazar: -2 }, texto: CONFIG.formulaMedia },
          { col: mMediaCab("EXÁMENES"), filaInicio: { col: 1, valor: "EXÁMENES", desplazar: 2 }, filaFin: { col: 1, valor: "FIN", desplazar: -1 }, texto: CONFIG.formulaMedia },
        ],
      }
    );
  });

  // ── Asistencia: TODOS los estudiantes en UNA hoja ──
  if (todos.length) {
    const asis = nombreAsistencia();
    const orden = todos.map((e) => String(e.nie));
    todos.forEach((e) => acciones.push({
      a: "fila", hoja: asis, clave: String(e.nie),
      valores: [String(e.nie), e.nombre, gradoTexto(e.grado)], insertar: -1,
    }));
    acciones.push({ a: "reordenar", hoja: asis, desde: 2, hasta: 1 + todos.length, colClave: 1, orden });
  }

  return acciones;
}

/** Fila de cabecera de UNA tabla (TAREAS/EXÁMENES) por marca. */
function mCabSeccion(seccion) {
  return { col: 1, valor: seccion, desplazar: 1 };
}

/** Marca de la columna "Media" de la cabecera de una sección. */
function mMediaCab(seccion) {
  return { fila: mCabSeccion(seccion), valor: "Media" };
}

/** Acciones para registrar UNA nota de actividad (mejor esfuerzo).
 *  · tipo "clase": columna D{día}·U·L de la tabla CLASES con el TOTAL
 *    del estudiante (fila por NIE).
 *  · tipo "tarea"/"examen": fila del ESTUDIANTE (NIE en su tabla) ×
 *    columna de la actividad (T/E D{día}·U·L título) con el TOTAL. */
function accionesActividad(datos) {
  const { perfil, clase, materia, grado, actividadId, tipo = "clase", puntos = "", titulo = "" } = datos || {};
  if (!perfil || perfil.nie === undefined || perfil.nie === null || !perfil.nombre) {
    throw new Error("sin-estudiante");
  }
  if (materia === undefined || materia === null || grado === undefined || grado === null) {
    throw new Error("sin-clase");
  }
  const hoja = nombreNotas(materia, grado);
  const nie = String(perfil.nie);
  const acciones = [];

  if (tipo === "clase") {
    if (!clase) throw new Error("sin-clase");
    acciones.push(
      { a: "fila", hoja, clave: nie, valores: [nie, perfil.nombre], desde: 5, insertar: { col: 1, valor: "TAREAS", desplazar: -2 } },
      {
        a: "columna", hoja, filaClave: 4, clave: CONFIG.etiquetaClase(clase),
        insertar: { fila: 4, valor: "Σ", desplazar: 0 },
        ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
      },
      {
        a: "formato", hoja,
        rango: { desde: { fila: 5, col: "$1.col" }, hasta: { fila: { col: 1, valor: "TAREAS", desplazar: -2 }, col: "$1.col" } },
        patron: CONFIG.formatoNota,
      },
      { a: "celda", hoja, fila: "$0.fila", col: "$1.col", valor: puntos ?? "" },
      {
        a: "plantillas", hoja,
        plantillas: [
          { col: { fila: 4, valor: "Σ" }, filaInicio: 5, filaFin: { col: 1, valor: "TAREAS", desplazar: -2 }, texto: CONFIG.formulaSuma },
          { col: { fila: 4, valor: "Media" }, filaInicio: 5, filaFin: { col: 1, valor: "TAREAS", desplazar: -2 }, texto: CONFIG.formulaMedia },
        ],
      }
    );
  } else if (tipo === "examen" || tipo === "tarea") {
    if (!actividadId) throw new Error("sin-id");
    const seccion = tipo === "examen" ? "EXÁMENES" : "TAREAS";
    const letra = tipo === "examen" ? "E" : "T";
    // Fila del ESTUDIANTE dentro de SU tabla (búsqueda acotada con
    // `desde`; inserta antes de la última fila del bloque), con su
    // fórmula Media
    acciones.push(
      {
        a: "fila", hoja, clave: nie, valores: [nie, perfil.nombre],
        desde: { col: 1, valor: seccion, desplazar: 2 },
        insertar: { col: 1, valor: seccion === "TAREAS" ? "EXÁMENES" : "FIN", desplazar: -2 },
        plantillas: [{ col: mMediaCab(seccion), texto: CONFIG.formulaMedia }],
      },
      {
        a: "columna", hoja,
        filaClave: mCabSeccion(seccion),
        clave: CONFIG.etiquetaActividad({ dia: clase?.dia, unidad: clase?.unidad, leccion: clase?.leccion, titulo, clase }, letra),
        insertar: { fila: mCabSeccion(seccion), valor: "Media", desplazar: 0 },
        ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
      },
      {
        a: "formato", hoja,
        rango: { desde: { fila: "$0.fila", col: "$1.col" }, hasta: { fila: "$0.fila", col: "$1.col" } },
        patron: CONFIG.formatoNota,
      },
      { a: "celda", hoja, fila: "$0.fila", col: "$1.col", valor: puntos ?? "" }
    );
  } else {
    throw new Error("tipo-desconocido:" + tipo);
  }
  return acciones;
}

/** Acciones para registrar la asistencia de UN día (hoja única con
 *  todos los grados). estudiantes: [{ uid, nombre, nie, grado, estado }] */
function accionesAsistencia(datos) {
  const { fecha, estudiantes } = datos || {};
  if (!fecha) throw new Error("sin-fecha");
  if (!Array.isArray(estudiantes) || !estudiantes.length) throw new Error("sin-estudiantes");

  const hoja = nombreAsistencia();
  const ordenados = ordenEstudiantes(estudiantes);
  const fechaClave = CONFIG.etiquetaFecha(fecha);
  const acciones = [
    { a: "configurar", hojas: [specAsistencia(ordenados)], menu: null },
    { a: "columna", hoja, filaClave: 1, clave: fechaClave, insertar: -1, ancho: CONFIG.anchoFecha, estilo: ESTILOS.cabFecha },
  ];

  const base = acciones.length; // índice del resultado del 1.er "fila"
  ordenados.forEach((e) => acciones.push({
    a: "fila", hoja, clave: String(e.nie),
    valores: [String(e.nie), e.nombre, gradoTexto(e.grado)], insertar: -1,
  }));
  ordenados.forEach((e, i) => acciones.push({
    a: "celda", hoja, fila: "$" + (base + i) + ".fila", col: "$1.col", valor: e.estado,
  }));
  acciones.push({
    a: "reordenar", hoja, desde: 2, hasta: 1 + ordenados.length,
    colClave: 1, orden: ordenados.map((e) => String(e.nie)),
  });
  return acciones;
}

/* -------- Envoltorios "mejor esfuerzo" (NUNCA lanzan) -------- */

export async function configurar(datos) {
  try {
    return await llamar(accionesConfigurar(datos), { timeout: CONFIG.timeoutConfigurarMs });
  } catch (e) {
    return { ok: false, razon: "peticion", detalle: String((e && e.message) || e) };
  }
}

export async function actividad(datos) {
  let acciones;
  try {
    acciones = accionesActividad(datos);
  } catch (e) {
    return { ok: false, razon: "peticion", detalle: String((e && e.message) || e) };
  }
  const r = await llamar(acciones);
  if (r && r.ok && (r.resultados || []).some((x) => x && String(x.error || "").indexOf("hoja-no-existe") === 0)) {
    return {
      ok: false,
      razon: "hoja-no-existe",
      detalle: "Ejecuta db.sheets.configurar() una vez para crear " + nombreNotas(datos.materia, datos.grado),
    };
  }
  return r;
}

export async function asistencia(datos) {
  try {
    return await llamar(accionesAsistencia(datos), { timeout: CONFIG.timeoutConfigurarMs });
  } catch (e) {
    return { ok: false, razon: "peticion", detalle: String((e && e.message) || e) };
  }
}

/* ════════════════════ 6. PRUEBAS ════════════════════
   Interno: permite probar los constructores con Node sin navegador
   (ver scripts/test-sheets-v2.mjs). NO usar en la app. */

export const _debug = {
  CONFIG, ESTILOS,
  colALetra, claveApellidos, ordenEstudiantes, gradoTexto,
  nombreAsistencia, nombreNotas,
  specIndice, specAsistencia, specNotas,
  accionesConfigurar, accionesActividad, accionesAsistencia,
};