// ============================================================
// sheets.js — TODO lo que se dibuja en la hoja de cálculo
//             (js/data/sheets.js)
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
  versionNotas: 1,
  versionAsistencia: 1,

  // Formatos de número (sintaxis de hoja):
  formatoNota: "0.##",  // notas con decimales sin ceros de más
  formatoTexto: "@",    // NIEs e IDs como texto (conserva ceros a la izquierda)
  minNota: 0,
  maxNota: 10,

  // Anchuras (px):
  anchoNIE: 90,
  anchoNombre: 220,
  anchoNota: 64,       // columnas de notas/días
  anchoFecha: 96,      // columnas de fecha en Asistencia
  anchoTotal: 56,      // columna Σ
  anchoMedia: 70,      // columnas Media
  anchoExamen: 220,    // columna título de examen/tarea

  // ETIQUETAS (lo que se ve en los encabezados). Son también la
  // CLAVE con la que el motor busca cada columna: si las cambias,
  // las columnas viejas quedan huérfanas (mejor subir version*).
  etiquetaFecha: (iso) => String(iso || ""),
  etiquetaClase: (c) =>
    "D" + (c?.dia ?? "?") + "·U" + (c?.unidad ?? "?") + "·L" + (c?.leccion ?? "?"),
  tituloNotas: (materia, grado) => "NOTAS · " + materia + " · " + grado + "°",
  tituloAsistencia: (grado) => "ASISTENCIA · " + grado + "°",

  menu: { hoja: "Menú", titulo: "Mis Clases Online · Menú" },

  // Asistencia: valores permitidos y su semántica (A/T/F):
  estados: ["A", "T", "F"],

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
};

const REGLAS_MEDIA = [
  { cuando: "menor", valor: 6, fondo: "#fee2e2", color: "#991b1b" },
  { cuando: "mayorIgual", valor: 8, fondo: "#dcfce7", color: "#166534" },
];

const REGLAS_ESTADO = [
  { cuando: "texto", valor: "A", fondo: "#dcfce7", color: "#166534" }, // Asistió
  { cuando: "texto", valor: "T", fondo: "#fef9c3", color: "#854d0e" }, // Tardanza
  { cuando: "texto", valor: "F", fondo: "#fee2e2", color: "#991b1b" }, // Falta
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
function ordenEstudiantes(lista) {
  return (lista || [])
    .slice()
    .sort((a, b) => claveApellidos(a.nombre).localeCompare(claveApellidos(b.nombre), "es"));
}

const nombreAsistencia = (grado) => "Asistencia-" + String(grado);
const nombreNotas = (materia, grado) => "Notas-" + String(materia) + "-" + String(grado);

/* ════════════════════ 3. CONSTRUCTORES DE HOJAS ════════════════════
   Cada "spec" es la foto declarativa de una hoja. Las posiciones
   dinámicas van como MARCAS ({col,valor,desplazar,respaldo}) para que
   el motor las re-ubique solo aunque las tablas hayan crecido. */

function specAsistencia(grado, estudiantes) {
  const ne = estudiantes.length;
  const maxFilas = Math.max(60, ne + 40);
  const finDatos = Math.max(ne + 1, 2);
  return {
    nombre: nombreAsistencia(grado),
    version: CONFIG.versionAsistencia,
    maxFilas,
    maxColumnas: 60,
    congelar: { fila: 1, col: 2 },
    cabeceras: [{ fila: 1, valores: ["NIE", "Estudiante"] }],
    filasIniciales: [
      { fila: 2, valores: estudiantes.map((e) => [String(e.nie), e.nombre]) },
    ],
    anchos: { A: CONFIG.anchoNIE, B: CONFIG.anchoNombre },
    formatos: [
      { rango: { desde: { fila: 2, col: 1 }, hasta: { fila: maxFilas - 10, col: 1 } }, patron: CONFIG.formatoTexto },
    ],
    validaciones: [
      { rango: { desde: { fila: 2, col: 3 }, hasta: { fila: maxFilas - 10, col: 50 } }, opciones: CONFIG.estados, estricta: false },
    ],
    condicionales: [
      { rango: { desde: { fila: 2, col: 3 }, hasta: { fila: maxFilas - 10, col: 50 } }, reglas: REGLAS_ESTADO },
    ],
    estilos: [
      { rango: { fila: 1, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.cabAsistencia },
      { rango: { desde: { fila: 1, col: 3 }, hasta: { fila: 1, col: 50 } }, estilo: ESTILOS.cabFecha },
      { rango: { desde: { fila: 2, col: 1 }, hasta: { fila: finDatos, col: 50 } }, estilo: ESTILOS.celdas },
    ],
  };
}

/* Hoja Notas-{materia}-{grado}: tres tablas apiladas.
   CLASES:   A=NIE · B=Estudiante · [una columna por clase] · Σ · Media
   EXÁMENES: A=ID · B=Examen · [una columna por NIE] · Media
   TAREAS:   A=ID · B=Tarea · [una columna por NIE] · Media */
function specNotas({ materia, grado, estudiantes, clases = [], examenes = [], tareas = [] }) {
  const ne = estudiantes.length, nc = clases.length, nx = examenes.length, nt = tareas.length;

  // ── Filas base (posición al CREAR; después el motor usa marcas) ──
  const fSecCl = 3, fCabCl = 4, fAlu = 5;
  const fFinAlu = fAlu + ne - 1;
  const fSecEx = fFinAlu + 2, fCabEx = fSecEx + 1, fEx = fCabEx + 1;
  const fFinEx = fCabEx + nx;
  const fSecTa = fFinEx + 2, fCabTa = fSecTa + 1, fTa = fCabTa + 1;
  const fFinTa = fCabTa + nt;

  // ── Marcas que se autoubican (respaldo = posición al crear) ──
  const mSecEx = { col: 1, valor: "EXÁMENES", respaldo: fSecEx };
  const mCabEx = { col: 1, valor: "EXÁMENES", desplazar: 1, respaldo: fCabEx };
  const mSecTa = { col: 1, valor: "TAREAS", respaldo: fSecTa };
  const mCabTa = { col: 1, valor: "TAREAS", desplazar: 1, respaldo: fCabTa };
  const mFinAlu = { col: 1, valor: "EXÁMENES", desplazar: -2, respaldo: fFinAlu };
  const mFinEx = { col: 1, valor: "TAREAS", desplazar: -2, respaldo: fFinEx };
  const mIniEx = { col: 1, valor: "EXÁMENES", desplazar: 2, respaldo: fEx };
  const mIniTa = { col: 1, valor: "TAREAS", desplazar: 2, respaldo: fTa };

  // ── Columnas clave (por marca: siempre correctas aunque crezcan) ──
  const colSuma = 3 + nc, colMediaCl = 4 + nc, colMediaEx = 3 + ne;
  const mSuma = { fila: fCabCl, valor: "Σ", respaldo: colSuma };
  const mMediaCl = { fila: fCabCl, valor: "Media", respaldo: colMediaCl };
  const mMediaEx = { fila: mCabEx, valor: "Media", respaldo: colMediaEx };
  const mMediaTa = { fila: mCabTa, valor: "Media", respaldo: colMediaEx };
  const mUltCl = { fila: fCabCl, valor: "Σ", desplazar: -1, respaldo: colSuma - 1 };
  const mUltEx = { fila: mCabEx, valor: "Media", desplazar: -1, respaldo: colMediaEx - 1 };
  const mUltTa = { fila: mCabTa, valor: "Media", desplazar: -1, respaldo: colMediaEx - 1 };

  const anchos = { A: CONFIG.anchoNIE, B: CONFIG.anchoNombre };
  const maxDatos = Math.max(2 + nc, 2 + ne);
  for (let i = 3; i <= maxDatos; i++) anchos[colALetra(i)] = CONFIG.anchoNota;
  anchos[colALetra(colSuma)] = CONFIG.anchoTotal;
  anchos[colALetra(colMediaCl)] = CONFIG.anchoMedia;
  anchos[colALetra(colMediaEx)] = CONFIG.anchoMedia;

  const plantillas = [];
  if (ne > 0) {
    plantillas.push(
      { col: mSuma, filaInicio: fAlu, filaFin: mFinAlu, texto: CONFIG.formulaSuma },
      { col: mMediaCl, filaInicio: fAlu, filaFin: mFinAlu, texto: CONFIG.formulaMedia },
    );
  }
  if (nx > 0) plantillas.push({ col: mMediaEx, filaInicio: mIniEx, filaFin: mFinEx, texto: CONFIG.formulaMedia });
  if (nt > 0) plantillas.push({ col: mMediaTa, filaInicio: mIniTa, filaFin: fFinTa, texto: CONFIG.formulaMedia });

  return {
    nombre: nombreNotas(materia, grado),
    version: CONFIG.versionNotas,
    maxFilas: fFinTa + 40,
    maxColumnas: Math.max(colMediaCl, colMediaEx) + 8,
    congelar: { fila: 1, col: 2 },
    cabeceras: [
      { fila: 1, valores: [CONFIG.tituloNotas(materia, grado)] },
      { fila: fSecCl, valores: ["CLASES"] },
      { fila: fCabCl, valores: ["NIE", "Estudiante", ...clases.map((c) => CONFIG.etiquetaClase(c)), "Σ", "Media"], soloAlCrear: true },
      { fila: mSecEx, valores: ["EXÁMENES"] },
      { fila: mCabEx, valores: ["ID", "Examen", ...estudiantes.map((e) => String(e.nie)), "Media"], soloAlCrear: true },
      { fila: mSecTa, valores: ["TAREAS"] },
      { fila: mCabTa, valores: ["ID", "Tarea", ...estudiantes.map((e) => String(e.nie)), "Media"], soloAlCrear: true },
    ],
    filasIniciales: [
      { fila: fAlu, valores: estudiantes.map((e) => [String(e.nie), e.nombre]) },
      { fila: fEx, valores: examenes.map((x) => [String(x.id), x.titulo || ""]) },
      { fila: fTa, valores: tareas.map((t) => [String(t.id), t.titulo || ""]) },
    ].filter((b) => b.valores.length),
    anchos,
    plantillas,
    formatos: [
      { rango: { desde: { fila: fAlu, col: 1 }, hasta: { fila: mFinAlu, col: 1 } }, patron: CONFIG.formatoTexto },
      { rango: { desde: { fila: mIniEx, col: 1 }, hasta: { fila: mFinEx, col: 1 } }, patron: CONFIG.formatoTexto },
      { rango: { desde: { fila: mIniTa, col: 1 }, hasta: { fila: fFinTa, col: 1 } }, patron: CONFIG.formatoTexto },
      { rango: { desde: { fila: mCabEx, col: 3 }, hasta: { fila: mCabEx, col: mUltEx } }, patron: CONFIG.formatoTexto },
      { rango: { desde: { fila: mCabTa, col: 3 }, hasta: { fila: mCabTa, col: mUltTa } }, patron: CONFIG.formatoTexto },
      { rango: { desde: { fila: fAlu, col: 3 }, hasta: { fila: mFinAlu, col: mUltCl } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: mIniEx, col: 3 }, hasta: { fila: mFinEx, col: mUltEx } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: mIniTa, col: 3 }, hasta: { fila: fFinTa, col: mUltTa } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: fAlu, col: mSuma }, hasta: { fila: mFinAlu, col: mMediaCl } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: mIniEx, col: mMediaEx }, hasta: { fila: mFinEx, col: mMediaEx } }, patron: CONFIG.formatoNota },
      { rango: { desde: { fila: mIniTa, col: mMediaTa }, hasta: { fila: fFinTa, col: mMediaTa } }, patron: CONFIG.formatoNota },
    ],
    validaciones: [
      { rango: { desde: { fila: fAlu, col: 3 }, hasta: { fila: mFinAlu, col: mUltCl } }, tipo: "numero", min: CONFIG.minNota, max: CONFIG.maxNota, estricta: false },
      { rango: { desde: { fila: mIniEx, col: 3 }, hasta: { fila: mFinEx, col: mUltEx } }, tipo: "numero", min: CONFIG.minNota, max: CONFIG.maxNota, estricta: false },
      { rango: { desde: { fila: mIniTa, col: 3 }, hasta: { fila: fFinTa, col: mUltTa } }, tipo: "numero", min: CONFIG.minNota, max: CONFIG.maxNota, estricta: false },
    ],
    condicionales: [
      { rango: { desde: { fila: fAlu, col: mMediaCl }, hasta: { fila: mFinAlu, col: mMediaCl } }, reglas: REGLAS_MEDIA },
      { rango: { desde: { fila: mIniEx, col: mMediaEx }, hasta: { fila: mFinEx, col: mMediaEx } }, reglas: REGLAS_MEDIA },
      { rango: { desde: { fila: mIniTa, col: mMediaTa }, hasta: { fila: fFinTa, col: mMediaTa } }, reglas: REGLAS_MEDIA },
    ],
    estilos: [
      { rango: { fila: 1, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.titulo },
      { rango: { fila: fSecCl, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.seccion },
      { rango: { fila: mSecEx, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.seccion },
      { rango: { fila: mSecTa, col: 1, filas: 1, cols: 2 }, estilo: ESTILOS.seccion },
      { rango: { desde: { fila: fCabCl, col: 1 }, hasta: { fila: fCabCl, col: mMediaCl } }, estilo: ESTILOS.cab },
      { rango: { desde: { fila: mCabEx, col: 1 }, hasta: { fila: mCabEx, col: mMediaEx } }, estilo: ESTILOS.cab },
      { rango: { desde: { fila: mCabTa, col: 1 }, hasta: { fila: mCabTa, col: mMediaTa } }, estilo: ESTILOS.cab },
      { rango: { desde: { fila: fAlu, col: 1 }, hasta: { fila: mFinAlu, col: mMediaCl } }, estilo: ESTILOS.celdas },
      { rango: { desde: { fila: mIniEx, col: 1 }, hasta: { fila: mFinEx, col: mMediaEx } }, estilo: ESTILOS.celdas },
      { rango: { desde: { fila: mIniTa, col: 1 }, hasta: { fila: fFinTa, col: mMediaTa } }, estilo: ESTILOS.celdas },
    ],
  };
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

/** Acciones para sincronizar estructuras + alumnado + clases/exámenes/tareas. */
function accionesConfigurar(datos) {
  const d = datos || {};
  const estudiantes = ordenEstudiantes(d.estudiantes || []);
  const hayGrado = d.grado !== undefined && d.grado !== null && d.grado !== "";
  const hojas = [];
  if (hayGrado) hojas.push(specAsistencia(d.grado, estudiantes));
  if (d.materia) {
    hojas.push(
      specNotas({
        materia: d.materia, grado: d.grado, estudiantes,
        clases: d.clases || [], examenes: d.examenes || [], tareas: d.tareas || [],
      })
    );
  }
  if (!hojas.length) throw new Error("nada-que-configurar");

  const acciones = [{
    a: "configurar",
    hojas,
    menu: {
      hoja: CONFIG.menu.hoja,
      titulo: CONFIG.menu.titulo,
      estiloTitulo: ESTILOS.titulo,
      estiloEnlaces: ESTILOS.enlace,
    },
  }];

  if (d.materia) {
    const notas = nombreNotas(d.materia, d.grado);
    const orden = estudiantes.map((e) => String(e.nie));

    // Alumnado como filas de CLASES (Σ/Media se re-estampan al final):
    estudiantes.forEach((e) => acciones.push({
      a: "fila", hoja: notas, clave: String(e.nie),
      valores: [String(e.nie), e.nombre],
      insertar: { col: 1, valor: "EXÁMENES", desplazar: -1 },
    }));
    // Clases como columnas de CLASES:
    (d.clases || []).forEach((c) => acciones.push({
      a: "columna", hoja: notas, filaClave: 4, clave: CONFIG.etiquetaClase(c),
      insertar: { fila: 4, valor: "Σ", desplazar: 0 },
      ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
    }));
    // Alumnado como columnas de EXÁMENES y TAREAS:
    estudiantes.forEach((e) => acciones.push(
      {
        a: "columna", hoja: notas,
        filaClave: { col: 1, valor: "EXÁMENES", desplazar: 1 }, clave: String(e.nie),
        insertar: { fila: { col: 1, valor: "EXÁMENES", desplazar: 1 }, valor: "Media", desplazar: 0 },
        ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
      },
      {
        a: "columna", hoja: notas,
        filaClave: { col: 1, valor: "TAREAS", desplazar: 1 }, clave: String(e.nie),
        insertar: { fila: { col: 1, valor: "TAREAS", desplazar: 1 }, valor: "Media", desplazar: 0 },
        ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
      }
    ));
    // Exámenes y tareas como filas (con su fórmula Media):
    (d.examenes || []).forEach((x) => acciones.push({
      a: "fila", hoja: notas, clave: String(x.id), valores: [String(x.id), x.titulo || ""],
      insertar: { col: 1, valor: "TAREAS", desplazar: -1 },
      plantillas: [{ col: mMediaCab("EXÁMENES"), texto: CONFIG.formulaMedia }],
    }));
    (d.tareas || []).forEach((t) => acciones.push({
      a: "fila", hoja: notas, clave: String(t.id), valores: [String(t.id), t.titulo || ""],
      insertar: -1,
      plantillas: [{ col: mMediaCab("TAREAS"), texto: CONFIG.formulaMedia }],
    }));
    // Ordenar alumnado por apellidos y re-estampar Σ/Media (reordenar
    // reescribe valores y mata fórmulas):
    if (estudiantes.length) {
      acciones.push(
        { a: "reordenar", hoja: notas, desde: 5, hasta: 4 + estudiantes.length, colClave: 1, orden },
        {
          a: "plantillas", hoja: notas,
          plantillas: [
            { col: { fila: 4, valor: "Σ" }, filaInicio: 5, filaFin: { col: 1, valor: "EXÁMENES", desplazar: -2 }, texto: CONFIG.formulaSuma },
            { col: { fila: 4, valor: "Media" }, filaInicio: 5, filaFin: { col: 1, valor: "EXÁMENES", desplazar: -2 }, texto: CONFIG.formulaMedia },
          ],
        }
      );
    }
  }

  if (hayGrado && estudiantes.length) {
    const asis = nombreAsistencia(d.grado);
    const orden = estudiantes.map((e) => String(e.nie));
    estudiantes.forEach((e) => acciones.push({
      a: "fila", hoja: asis, clave: String(e.nie),
      valores: [String(e.nie), e.nombre], insertar: -1,
    }));
    acciones.push({ a: "reordenar", hoja: asis, desde: 2, hasta: 1 + estudiantes.length, colClave: 1, orden });
  }

  return acciones;
}

/** Marca de la columna "Media" de la cabecera de una sección. */
function mMediaCab(seccion) {
  return { fila: { col: 1, valor: seccion, desplazar: 1 }, valor: "Media" };
}

/** Acciones para registrar UNA nota de actividad (mejor esfuerzo). */
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
      { a: "fila", hoja, clave: nie, valores: [nie, perfil.nombre], insertar: { col: 1, valor: "EXÁMENES", desplazar: -1 } },
      {
        a: "columna", hoja, filaClave: 4, clave: CONFIG.etiquetaClase(clase),
        insertar: { fila: 4, valor: "Σ", desplazar: 0 },
        ancho: CONFIG.anchoNota, estilo: ESTILOS.cab,
      },
      {
        a: "formato", hoja,
        rango: { desde: { fila: 5, col: "$1.col" }, hasta: { fila: { col: 1, valor: "EXÁMENES", desplazar: -2 }, col: "$1.col" } },
        patron: CONFIG.formatoNota,
      },
      { a: "celda", hoja, fila: "$0.fila", col: "$1.col", valor: puntos ?? "" },
      {
        a: "plantillas", hoja,
        plantillas: [
          { col: { fila: 4, valor: "Σ" }, filaInicio: 5, filaFin: { col: 1, valor: "EXÁMENES", desplazar: -2 }, texto: CONFIG.formulaSuma },
          { col: { fila: 4, valor: "Media" }, filaInicio: 5, filaFin: { col: 1, valor: "EXÁMENES", desplazar: -2 }, texto: CONFIG.formulaMedia },
        ],
      }
    );
  } else if (tipo === "examen" || tipo === "tarea") {
    if (!actividadId) throw new Error("sin-id");
    const seccion = tipo === "examen" ? "EXÁMENES" : "TAREAS";
    acciones.push(
      {
        a: "fila", hoja, clave: String(actividadId), valores: [String(actividadId), titulo || ""],
        insertar: tipo === "tarea" ? -1 : { col: 1, valor: "TAREAS", desplazar: -1 },
        plantillas: [{ col: mMediaCab(seccion), texto: CONFIG.formulaMedia }],
      },
      {
        a: "columna", hoja,
        filaClave: { col: 1, valor: seccion, desplazar: 1 }, clave: nie,
        insertar: { fila: { col: 1, valor: seccion, desplazar: 1 }, valor: "Media", desplazar: 0 },
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

/** Acciones para registrar la asistencia de UN día completo. */
function accionesAsistencia(datos) {
  const { grado, fecha, estudiantes } = datos || {};
  if (grado === undefined || grado === null || grado === "") throw new Error("sin-grado");
  if (!fecha) throw new Error("sin-fecha");
  if (!Array.isArray(estudiantes) || !estudiantes.length) throw new Error("sin-estudiantes");

  const hoja = nombreAsistencia(grado);
  const ordenados = ordenEstudiantes(estudiantes);
  const fechaClave = CONFIG.etiquetaFecha(fecha);
  const acciones = [
    { a: "configurar", hojas: [specAsistencia(grado, ordenados)], menu: null },
    { a: "columna", hoja, filaClave: 1, clave: fechaClave, insertar: -1, ancho: CONFIG.anchoFecha, estilo: ESTILOS.cabFecha },
  ];

  const base = acciones.length; // índice del resultado del 1.er "fila"
  ordenados.forEach((e) => acciones.push({
    a: "fila", hoja, clave: String(e.nie), valores: [String(e.nie), e.nombre], insertar: -1,
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
   (ver scripts/test-sheets.mjs). NO usar en la app. */

export const _debug = {
  CONFIG, ESTILOS,
  colALetra, claveApellidos, ordenEstudiantes,
  nombreAsistencia, nombreNotas,
  specAsistencia, specNotas,
  accionesConfigurar, accionesActividad, accionesAsistencia,
};