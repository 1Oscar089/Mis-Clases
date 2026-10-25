// ============================================================
// graficador-funciones-cartesianas.js — Recurso visual:
// GRAFICADOR DE FUNCIONES CARTESIANAS · v2 (con RECORTES de porción)
// (recursos/js/visuales/graficador-funciones-cartesianas.js)
//
// Dibuja un PLANO CARTESIANO puramente ilustrativo en SVG nativo
// (cero librerías, cero imports, cero eventos, cero canvas): la
// cuadrícula sale según la ESCALA pedida, los ejes son negros y
// numerados, y las curvas se trazan en el color de cada función.
//
// ─── EL ANALIZADOR MATEMÁTICO (conceptual, sin librerías) ───
// Todo el «cerebro» es JavaScript puro y trabaja en 5 pasos:
//
//   1. NORMALIZACIÓN — el texto del docente se limpia: minúsculas,
//      sin acentos, símbolos unicode convertidos (² → ^2, √ → sqrt,
//      π → pi, × · → *, ÷ → /, − → -, ≥ ≤ → >= <=) y la coma decimal
//      entre dígitos se vuelve punto (0,5 → 0.5).
//   2. TOKENIZACIÓN — un lector va partiendo el texto en piezas:
//      números (acepta 2e-3), variables (solo x y y), constantes
//      (pi, e, tau), funciones (sin, cos, tan, sqrt, abs, ln, log,
//      exp, floor… con alias en español: sen, tg, senh, raiz,
//      arcsen, arccos, arctg) y símbolos. Acepta 3 escrituras que
//      todos hacen a mano: «2x», «2(x+1)» y «(x+1)(x-1)» insertando
//      la multiplicación implícita; también barre letra por letra
//      los correrías tipo «xy» (x*y) o «2senx» (2*sen(x)) y admite
//      |…| como valor absoluto.
//   3. PARSER (descenso recursivo) — las piezas se arman en un
//      ÁRBOL de expresión respetando la precedencia real:
//      paréntesis/|…| > funciones > ^ (derecha: x^2^3 = x^(2^3),
//      admite x^-2) > * y / > + y -. Un solo signo «=» separa los
//      dos lados; los comparadores < > <= >= solo valen en ÁREAS.
//   4. COMPILACIÓN — el árbol se convierte en una FUNCIÓN nativa
//      f(x, y) hecha de cierres anidados (sin eval ni new Function):
//      cada nodo produce una flechita que combina las de sus hijos.
//      Resultado: miles de evaluaciones por milisegundo, sin
//      librerías y sin riesgo: el intérprete solo sabe hacer lo
//      que el árbol trae.
//   5. CLASIFICACIÓN Y TRAZADO — el visual decide CÓMO dibujar
//      cada ecuación sin que el docente despeje nada:
//        · «y = f(x)» sin y a la derecha  → curva EXPLÍCITA: se
//          muestrea x píxel a píxel (forma general y = ax²+bx+c,
//          canónica y = a(x-h)²+k, factorizada, trigonométricas…).
//          Corta el trazo en NaN y en saltos de asíntota (tan, 1/x).
//        · «x = f(y)» sin x a la derecha → EXPLÍCITA en y: misma
//          idea recorriendo y (parábolas tendidas hacia el eje X).
//        · TODO lo demás  → IMPLÍCITA F(x,y) = 0 con el método
//          MARCHING SQUARES: se evalúa F en una malla fina (cada
//          ~3 px), y en cada celda donde F cambia de signo se
//          interpola linealmente el cruce por cero. Así salen
//          precisas la circunferencia y las cónicas en cualquiera
//          de sus formas — general Ax²+By²+Cxy+Dx+Ey+F = 0,
//          canónica (x-h)²/a² + (y-k)²/b² = 1, sin despejar
//          (y² = 4px, xy = 4) — e incluso curvas que ninguna
//          fórmula explícita puede describir.
//
// ─── CONFIGURACIÓN (un solo objeto) ───
//   rango         { xMin, xMax, yMin, yMax } — extremos de los ejes.
//                 Lo que falte usa el defecto -20 … 20.
//   escala        Separación entre líneas de la cuadrícula y entre
//                 números de los ejes. (Defecto: 1)
//   cuadrantes    [1, 2, 3, 4] — cuáles mostrar. Vacío o ausente =
//                 los cuatro. La ventana se recorta a los cuadrantes
//                 pedidos (1·3 no contiguos muestran su envolvente).
//   funciones     Lista de GRÁFICAS. Cada una es un OBJETO
//                 { ecuacion, color, acotaciones, recorte } o una
//                 LÍNEA de texto «ecuación | color | acotaciones |
//                 recorte», ej:
//                   "y = x^2 | rojo | x:-2,5; y:3 | recorte x:-2,5"
//                 · ecuacion  cualquier formato: y=x², canónica,
//                   x=y²-4, x²+y²=9, (x-1)²/4+(y+2)²/9=1, y²=4x,
//                   xy=4, 2x+1 (se toma como y=2x+1)…
//                 · color     hex (#e74c3c, #e74c3c88) o nombre
//                   (rojo, azul, verde, negro, morado, celeste…).
//                   Sin color → paleta automática.
//                 · acotaciones  OPCIONAL «x:a,b; y:c» dibuja LÍNEAS
//                   ENTRECORTADAS en esas coordenadas (límites o
//                   asíntotas). Los valores pueden ser expresiones
//                   (pi/2). Sin x/y adentro.
//                 · recorte   OPCIONAL «x:a,b; y:c,d» RECORTA la
//                   gráfica: solo se dibuja la PORCIÓN con x entre
//                   a y b y/o y entre c y d. Cada eje lleva DOS
//                   valores (mínimo y máximo), que pueden ser
//                   expresiones (pi/2); si llegan al revés se
//                   acomodan solos. Es la diferencia con las
//                   acotaciones: esas SOLO marcan la línea punteada,
//                   el recorte SÍ corta la curva. En formato OBJETO
//                   admite recortar un solo lado:
//                   { xMin, xMax, yMin, yMax } (lo que falte, abierto).
//                 Con la lista VACÍA queda SOLO EL PLANO (sin gráficas).
//   areas         Lista OPCIONAL de zonas a colorear (semitono).
//                 Cada una es objeto o línea «tipo | … | color»:
//                   "entre | y=x^2 ; y=4-x | x=0..4 | #2563eb44"
//                     → área ENTRE las dos curvas (o «; y=0» = con el
//                       eje X) recortada al rango x=de..a (opcional).
//                   "region | y >= x^2 | #dc262633"
//                     → REGION donde se cumple la desigualdad
//                       (>=, >, <=, <; un lado puede ser constante).
//                   "region | x=0..4 | #16a34a33"
//                     → franja/rectángulo: IDEAL para marcar el
//                       DOMINIO (x=a..b), el rango (y=a..b) o ambos
//                       (x=a..b, y=c..d). Con «no » delante se niega
//                       (region | no y > 0 → el «no dominio»).
//                 Los extremos admiten expresiones (x=0..2pi).
//   puntos        Lista OPCIONAL { letra, x, y, color } o línea
//                 «A(2,3) | color». La letra se muestra en
//                 MAYÚSCULA; las coordenadas admiten expresiones
//                 (pi, 1/2, -3) pero sin x ni y. El color es opcional.
//   etiquetas     true (defecto) → cada gráfica lleva SU ECUACIÓN
//                 escrita junto a la curva, en su color y con halo
//                 blanco para que se lea sobre la cuadrícula.
//   ancho         Ancho del dibujo en px. (Defecto: 560; el alto
//                 sale proporcional al rango y el SVG encoge solo
//                 en pantallas angostas)
//   contenedor    HTMLElement opcional. Sin él, el plano se agrega
//                 directo a la página principal.
//
// ─── ORDEN ESTRICTO DE CAPAS (de atrás hacia adelante) ───
//   1 zonas coloreadas (semitono)  · 2 cuadrícula según escala
//   3 ejes negros numerados        · 4 acotaciones entrecortadas
//   5 curvas continuas             · 6 puntos con letra
//   7 etiquetas de ecuaciones
//
// ─── REGLAS VISUALES ───
//   · Estático: sin eventos, sin animaciones, sin interacción.
//   · Ejes NEGROS (#000) con flechas; cuadrícula visible pero
//     detrás de todo; números formateados sin ruido decimal.
//   · Configuración inválida → LANZA un Error con el motivo
//     (igual que el resto de los visuales del proyecto).
// ============================================================

/* ══════════════════════════════════════════════════════════
   1 · NORMALIZACIÓN
   ══════════════════════════════════════════════════════════ */

   const MAPA_UNICODE = [
    [/²/g, "^2"], [/³/g, "^3"], [/⁴/g, "^4"], [/⁵/g, "^5"],
    [/√/g, "sqrt"], [/π/g, "pi"], [/×|·/g, "*"], [/÷/g, "/"],
    [/−|–|—/g, "-"], [/≥/g, ">="], [/≤/g, "<="],
  ];
  
  function quitarAcentos(t) {
    return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  
  /* Para ECUACIONES: también vuelve coma decimal → punto. Las listas
     (acotaciones, puntos, rangos) se parten por coma ANTES de llegar
     aquí, así la coma nunca se confunde de rol. */
  function normalizarTexto(texto) {
    let t = quitarAcentos(String(texto ?? "")).toLowerCase().trim();
    for (const [re, s] of MAPA_UNICODE) t = t.replace(re, s);
    t = t.replace(/(\d)\s*,\s*(\d)/g, "$1.$2");
    return t.replace(/\s+/g, " ").trim();
  }
  
  /* ══════════════════════════════════════════════════════════
     2 · TOKENIZADOR
     ══════════════════════════════════════════════════════════ */
  
  const FUNCIONES_MAT = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    ln: Math.log, log: Math.log10, log10: Math.log10,
    exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
    round: Math.round, sign: Math.sign,
  };
  const ALIAS_FN = {
    sen: "sin", senh: "sinh", tg: "tan",
    arcsen: "asin", arccos: "acos", arctg: "atan", raiz: "sqrt",
  };
  const CONSTANTES_MAT = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };
  
  const PALABRAS_ORDENADAS = [...new Set([
    ...Object.keys(FUNCIONES_MAT),
    ...Object.keys(ALIAS_FN),
    ...Object.keys(CONSTANTES_MAT),
  ])].sort((a, b) => b.length - a.length);
  
  function tokenizar(texto) {
    const t = normalizarTexto(texto);
    if (!t) throw new Error("la expresión está vacía");
    const toks = [];
    const esDigito = (c) => c >= "0" && c <= "9";
    let i = 0;
    while (i < t.length) {
      const c = t[i];
      if (c === " ") { i++; continue; }
      /* número: 12 · 3.5 · .5 · 2e-3 */
      if (esDigito(c) || (c === "." && esDigito(t[i + 1] ?? ""))) {
        let j = i;
        while (j < t.length && (esDigito(t[j]) || t[j] === ".")) j++;
        if ((t[j] === "e") && (esDigito(t[j + 1] ?? "") ||
            ((t[j + 1] === "+" || t[j + 1] === "-") && esDigito(t[j + 2] ?? "")))) {
          j += 2;
          while (j < t.length && esDigito(t[j])) j++;
        }
        const num = Number(t.slice(i, j));
        if (!Number.isFinite(num)) throw new Error("«" + t.slice(i, j) + "» no es un número válido");
        toks.push({ t: "num", v: num });
        i = j;
        continue;
      }
      if (c === "x" || c === "y") { toks.push({ t: "var", v: c }); i++; continue; }
      /* palabra: función/constante o corrida de letras (xy → x*y) */
      if (c >= "a" && c <= "z") {
        const resto = t.slice(i);
        const palabra = PALABRAS_ORDENADAS.find((p) => resto.startsWith(p));
        if (palabra) {
          const canon = ALIAS_FN[palabra] || palabra;
          toks.push(canon in FUNCIONES_MAT ? { t: "fn", v: canon } : { t: "cte", v: canon });
          i += palabra.length;
          continue;
        }
        const rara = (resto.match(/^[a-z]+/) || ["?"])[0];
        throw new Error("no reconozco «" + rara + "»: las variables son x y y; usa números y funciones como sin, cos, tan, sqrt, abs, ln, log, exp (también sen, tg, raiz)");
      }
      if (c === "(") { toks.push({ t: "pa", v: "(" }); i++; continue; }
      if (c === ")") { toks.push({ t: "pa", v: ")" }); i++; continue; }
      if (c === "|") { toks.push({ t: "barra" }); i++; continue; }
      if (c === "^" || c === "*" || c === "/" || c === "+" || c === "-") {
        toks.push({ t: "op", v: c }); i++; continue;
      }
      if (c === ">") {
        if (t[i + 1] === "=") { toks.push({ t: "comp", v: ">=" }); i += 2; }
        else { toks.push({ t: "comp", v: ">" }); i++; }
        continue;
      }
      if (c === "<") {
        if (t[i + 1] === "=") { toks.push({ t: "comp", v: "<=" }); i += 2; }
        else { toks.push({ t: "comp", v: "<" }); i++; }
        continue;
      }
      if (c === "=") { toks.push({ t: "igual" }); i++; continue; }
      throw new Error("no acepto el símbolo «" + c + "»");
    }
    /* multiplicación implícita: 2x · 2(x+1) · (x+1)(x-1) · x|x| · |x|(y+1)
       Con BARRAS se sigue su estado: una barra que abre no se multiplica
       con lo que hay DENTRO; una que cierra sí cierra un átomo. */
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
        if (prevCierra && tkAbre) conMult.push({ t: "op", v: "*" });   /* |x||y| */
        barraAbierta = !barraAbierta;
        conMult.push(tk);
        continue;
      }
      if (prev && prevCierra && tkAbre) conMult.push({ t: "op", v: "*" });
      conMult.push(tk);
    }
    return conMult;
  }
  
  /* ══════════════════════════════════════════════════════════
     3 · PARSER (descenso recursivo → ÁRBOL)
     ══════════════════════════════════════════════════════════ */
  
  function parsearTokens(toks) {
    let pos = 0;
    const mirar = () => toks[pos];
    const tomar = () => toks[pos++];
  
    function expr() {
      let n = termino();
      while (mirar() && mirar().t === "op" && (mirar().v === "+" || mirar().v === "-")) {
        const op = tomar().v;
        n = { t: "bin", op, a: n, b: termino() };
      }
      return n;
    }
    function termino() {
      let n = factor();
      while (mirar() && mirar().t === "op" && (mirar().v === "*" || mirar().v === "/")) {
        const op = tomar().v;
        n = { t: "bin", op, a: n, b: factor() };
      }
      return n;
    }
    function factor() {
      if (mirar() && mirar().t === "op" && (mirar().v === "-" || mirar().v === "+")) {
        const op = tomar().v;
        const adentro = factor();
        return op === "-" ? { t: "neg", a: adentro } : adentro;
      }
      return potencia();
    }
    function potencia() {
      const base = atomo();
      if (mirar() && mirar().t === "op" && mirar().v === "^") {
        tomar();
        return { t: "bin", op: "^", a: base, b: factor() };  // derecha: x^2^3 y x^-2
      }
      return base;
    }
    function atomo() {
      const tk = mirar();
      if (!tk) throw new Error("la expresión termina antes de lo esperado");
      if (tk.t === "num") { tomar(); return { t: "num", v: tk.v }; }
      if (tk.t === "cte") { tomar(); return { t: "cte", v: tk.v }; }
      if (tk.t === "var") { tomar(); return { t: "var", v: tk.v }; }
      if (tk.t === "fn") {
        tomar();
        const abre = mirar();
        if (!(abre && abre.t === "pa" && abre.v === "(")) {
          throw new Error(tk.v + "(…) necesita paréntesis — ej: " + tk.v + "(x)");
        }
        tomar();
        const adentro = expr();
        if (!(mirar() && mirar().t === "pa" && mirar().v === ")")) {
          throw new Error("falta cerrar el paréntesis de " + tk.v + "(…");
        }
        tomar();
        return { t: "fn", v: tk.v, a: adentro };
      }
      if (tk.t === "pa" && tk.v === "(") {
        tomar();
        const adentro = expr();
        if (!(mirar() && mirar().t === "pa" && mirar().v === ")")) {
          throw new Error("falta cerrar un paréntesis");
        }
        tomar();
        return adentro;
      }
      if (tk.t === "barra") {
        tomar();
        const adentro = expr();
        if (!(mirar() && mirar().t === "barra")) throw new Error("falta la segunda barra |…|");
        tomar();
        return { t: "fn", v: "abs", a: adentro };
      }
      if (tk.t === "comp") throw new Error("un comparador («" + tk.v + "») solo va en las ÁREAS (region), no en una ecuación");
      if (tk.t === "igual") throw new Error("una ecuación solo puede llevar UN signo «=»");
      throw new Error("no espero «" + (tk.v ?? "|") + "» ahí");
    }
  
    const n = expr();
    if (pos < toks.length) throw new Error("sobran símbolos al final (revisa la expresión)");
    return n;
  }
  
  /* Parsea una expresión simple o una DESIGUALDAD (con comparador). */
  function arbolDe(texto) {
    const toks = tokenizar(texto);
    const idx = toks.findIndex((tk) => tk.t === "comp");
    if (idx === -1) return { exp: parsearTokens(toks) };
    return {
      izq: parsearTokens(toks.slice(0, idx)),
      comp: toks[idx].v,
      der: parsearTokens(toks.slice(idx + 1)),
    };
  }
  
  /* ══════════════════════════════════════════════════════════
     4 · COMPILADOR (árbol → función nativa con cierres)
     ══════════════════════════════════════════════════════════ */
  
  function compilar(nodo) {
    switch (nodo.t) {
      case "num": { const v = nodo.v; return () => v; }
      case "cte": { const v = CONSTANTES_MAT[nodo.v]; return () => v; }
      case "var": { const k = nodo.v; return (x, y) => (k === "x" ? x : y); }
      case "neg": { const a = compilar(nodo.a); return (x, y) => -a(x, y); }
      case "bin": {
        const a = compilar(nodo.a);
        const b = compilar(nodo.b);
        switch (nodo.op) {
          case "+": return (x, y) => a(x, y) + b(x, y);
          case "-": return (x, y) => a(x, y) - b(x, y);
          case "*": return (x, y) => a(x, y) * b(x, y);
          case "/": return (x, y) => a(x, y) / b(x, y);
          case "^": return (x, y) => Math.pow(a(x, y), b(x, y));
        }
        break;
      }
      case "fn": {
        const f = FUNCIONES_MAT[nodo.v];
        const a = compilar(nodo.a);
        return (x, y) => f(a(x, y));
      }
    }
    throw new Error("nodo desconocido del árbol");
  }
  
  function compilarExpr(texto) {
    return compilar(arbolDe(texto).exp);
  }
  
  /* Evalúa una expresión SIN variables (acotaciones, extremos de
     áreas, coordenadas de puntos). Lanza si lleva x o y. */
  function evaluarConstante(texto, paraQue) {
    const toks = tokenizar(texto);
    const conVar = toks.find((tk) => tk.t === "var");
    if (conVar) {
      throw new Error("en " + paraQue + " («" + texto + "») no puede ir " + conVar.v + ": escribe un número o una expresión sin variables (ej: pi/2, -3, 1/4)");
    }
    const v = compilar(arbolDe(texto).exp)(0, 0);
    if (!Number.isFinite(v)) throw new Error("«" + texto + "» no da un número definido");
    return v;
  }
  
  /* ══════════════════════════════════════════════════════════
     5 · ANALIZADOR DE ECUACIONES (todos los formatos → lo que
         el trazador necesita; el docente NO tiene que despejar)
     ══════════════════════════════════════════════════════════ */
  
  function contieneVar(texto) {
    return tokenizar(texto).some((tk) => tk.t === "var");
  }
  
  function contieneLaVar(texto, v) {
    return tokenizar(texto).some((tk) => tk.t === "var" && tk.v === v);
  }
  
  function analizarEcuacion(texto) {
    const limpio = String(texto ?? "").replace(/\s+/g, " ").trim();
    if (!limpio) throw new Error("hay una ecuación vacía");
    const t = normalizarTexto(limpio);
    const comp = t.match(/>=|<=|>|</);
    if (comp) {
      throw new Error("un comparador («" + comp[0] + "») solo va en las ÁREAS (region), no en una ecuación");
    }
    const partes = t.split("=");
    if (partes.length > 2) throw new Error("«" + limpio + "» lleva más de un signo «=»");
  
    let ladoA, ladoB;
    if (partes.length === 2) { ladoA = partes[0].trim(); ladoB = partes[1].trim(); }
    else { ladoA = "y"; ladoB = partes[0].trim(); }
  
    /* «9 = x^2+y^2» → los lados se acomodan solos */
    if (!contieneVar(ladoA) && contieneVar(ladoB)) { const tmp = ladoA; ladoA = ladoB; ladoB = tmp; }
  
    const esPalabra = (s, w) => s.replace(/\s/g, "") === w;
  
    /* y = f(x): la derecha NO puede volver a usar y (x sí vale) */
    if (esPalabra(ladoA, "y") && !contieneLaVar(ladoB, "y")) {
      const g = compilar(arbolDe(ladoB).exp);
      return {
        tipo: "fx",
        f: (x) => g(x, 0),
        etiqueta: partes.length === 2 ? limpio : "y = " + limpio,
      };
    }
    if (esPalabra(ladoB, "y") && !contieneLaVar(ladoA, "y")) {
      const g = compilar(arbolDe(ladoA).exp);
      return { tipo: "fx", f: (x) => g(x, 0), etiqueta: limpio };
    }
    /* x = f(y): la derecha NO puede volver a usar x (y sí vale) */
    if (esPalabra(ladoA, "x") && !contieneLaVar(ladoB, "x")) {
      const g = compilar(arbolDe(ladoB).exp);
      return { tipo: "fy", f: (y) => g(0, y), etiqueta: limpio };
    }
    if (esPalabra(ladoB, "x") && !contieneLaVar(ladoA, "x")) {
      const g = compilar(arbolDe(ladoA).exp);
      return { tipo: "fy", f: (y) => g(0, y), etiqueta: limpio };
    }
  
    /* Sin «=»: sin y → se toma como y = expr · con y → F(x,y) = 0 */
    if (partes.length === 1) {
      const g = compilar(arbolDe(ladoB).exp);
      if (!contieneVar(ladoB)) {
        return { tipo: "fx", f: (x) => g(x, 0), etiqueta: "y = " + limpio };
      }
      return { tipo: "implicita", f: (x, y) => g(x, y), etiqueta: limpio + " = 0" };
    }
    const gA = compilar(arbolDe(ladoA).exp);
    const gB = compilar(arbolDe(ladoB).exp);
    return {
      tipo: "implicita",
      f: (x, y) => gA(x, y) - gB(x, y),
      etiqueta: limpio,
    };
  }
  
  /* ── lectura de LÍNEAS «a | b | c» cuando el contenido puede llevar
        barras de valor absoluto (y=|x|): el color y las acotaciones
        se toman del FINAL de la línea y la ecuación se queda con todo
        lo demás ── */
  const esSegmentoAcot = (s) => /^\s*[xy]\s*:.+$/i.test(s);
  const esSegmentoRango = (s) => /^([xy])\s*=\s*.+\.\..+$/.test(s);
  /* El segmento de RECORTE lleva la palabra delante (para no
     confundirse con las acotaciones «x:a,b» ni con un color):
     «recorte x:0,4; y:2,8» o «recorte: x:0,4». */
  const esSegRecorte = (s) =>
    /^recorte(\s*:|\s|$)/i.test(quitarAcentos(String(s ?? "").trim()));
  
  function quitaColor(segs, colorOKfn) {
    if (segs.length < 2) return "";
    const ultimo = segs[segs.length - 1];
    if (colorOKfn(ultimo)) return segs.pop();
    return "";
  }
  
  /* ══════════════════════════════════════════════════════════
     6 · COLORES (hex 3/4/6/8 dígitos + nombres en español)
     ══════════════════════════════════════════════════════════ */
  
  const NOMBRES_COLOR = {
    negro: "#000000", blanco: "#ffffff", gris: "#6b7280",
    rojo: "#dc2626", vino: "#9f1239", rosa: "#ec4899", fucsia: "#d946ef",
    naranja: "#f97316", amarillo: "#eab308", lima: "#84cc16",
    verde: "#16a34a", turquesa: "#14b8a6", cian: "#06b6d4",
    celeste: "#0ea5e9", azul: "#2563eb", morado: "#7c3aed",
    violeta: "#8b5cf6", cafe: "#92400e", marron: "#92400e",
  };
  const PALETA = ["#dc2626", "#2563eb", "#16a34a", "#7c3aed", "#ea580c", "#0891b2", "#db2777", "#65a30d"];
  
  /* Devuelve { hex, alfa } o lanza con el motivo. */
  function leerColor(texto, paraQue) {
    const t = quitarAcentos(String(texto ?? "")).toLowerCase().trim();
    if (!t) throw new Error("hay un color vacío" + (paraQue ? " en " + paraQue : ""));
    if (NOMBRES_COLOR[t]) return { hex: NOMBRES_COLOR[t], alfa: 1 };
    const m = t.match(/^#([0-9a-f]{3,8})$/);
    if (m) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
      if (h.length === 6) return { hex: "#" + h, alfa: 1 };
      if (h.length === 8) return { hex: "#" + h.slice(0, 6), alfa: parseInt(h.slice(6), 16) / 255 };
    }
    throw new Error("no entiendo el color «" + texto + "»" + (paraQue ? " (" + paraQue + ")" : "") + ": usa hex (#e74c3c, #e74c3c88) o nombre (rojo, azul, verde, negro, morado, celeste…)");
  }
  
  function colorDeLista(texto, indice) {
    if (texto === undefined || texto === null || String(texto).trim() === "") {
      return { hex: PALETA[indice % PALETA.length], alfa: 1 };
    }
    return leerColor(texto, "el color de una función");
  }
  
  /* ¿El texto es un color aceptable? (para leer líneas sin romper |x|) */
  function esColorValido(texto) {
    try { leerColor(texto); return true; } catch (_) { return false; }
  }
  
  /* ══════════════════════════════════════════════════════════
     7 · GEOMETRÍA (rangos + cuadrantes → ventana y px)
     ══════════════════════════════════════════════════════════ */
  
  function numeroDe(v, defecto) {
    const n = typeof v === "string" ? Number(v.trim()) : Number(v);
    return Number.isFinite(n) ? n : defecto;
  }
  
  function construirGeo(cfg) {
    let xMin = numeroDe(cfg.rango?.xMin, -20);
    let xMax = numeroDe(cfg.rango?.xMax, 20);
    let yMin = numeroDe(cfg.rango?.yMin, -20);
    let yMax = numeroDe(cfg.rango?.yMax, 20);
    if (!(xMax > xMin)) throw new Error("el rango de X necesita mínimo < máximo (llegó " + xMin + " … " + xMax + ")");
    if (!(yMax > yMin)) throw new Error("el rango de Y necesita mínimo < máximo (llegó " + yMin + " … " + yMax + ")");
  
    const escala = numeroDe(cfg.escala, 1);
    if (!(escala > 0)) throw new Error("la escala debe ser un número mayor que 0 (llegó " + cfg.escala + ")");
  
    /* ventana = unión de los cuadrantes pedidos */
    let lista = (Array.isArray(cfg.cuadrantes) ? cfg.cuadrantes : [1, 2, 3, 4])
      .map(Number).filter((q) => q === 1 || q === 2 || q === 3 || q === 4);
    if (!lista.length) lista = [1, 2, 3, 4];
    const con = (q) => lista.includes(q);
    const arrancaX = [];
    const cierraX = [];
    const arrancaY = [];
    const cierraY = [];
    if (con(2) || con(3)) { arrancaX.push(xMin); cierraX.push(0); }
    if (con(1) || con(4)) { arrancaX.push(0); cierraX.push(xMax); }
    if (con(3) || con(4)) { arrancaY.push(yMin); cierraY.push(0); }
    if (con(1) || con(2)) { arrancaY.push(0); cierraY.push(yMax); }
    const x0 = Math.max(xMin, Math.min(...arrancaX));
    const x1 = Math.min(xMax, Math.max(...cierraX));
    const y0 = Math.max(yMin, Math.min(...arrancaY));
    const y1 = Math.min(yMax, Math.max(...cierraY));
    if (!(x1 > x0) || !(y1 > y0)) {
      /* los cuadrantes elegidos no cubren nada del rango: plano completo */
      return finalizarGeo(xMin, xMax, yMin, yMax, escala, cfg);
    }
    return finalizarGeo(x0, x1, y0, y1, escala, cfg);
  }
  
  function finalizarGeo(x0, x1, y0, y1, escala, cfg) {
    const ancho = Math.min(900, Math.max(260, numeroDe(cfg.ancho, 560)));
    const relacion = Math.min(1.15, Math.max(0.45, (y1 - y0) / (x1 - x0)));
    const alto = Math.round(ancho * relacion);
    return {
      x0, x1, y0, y1, escala, ancho, alto,
      pxX: (x) => ((x - x0) / (x1 - x0)) * ancho,
      pxY: (y) => alto - ((y - y0) / (y1 - y0)) * alto,
      enX: (px) => x0 + (px / ancho) * (x1 - x0),
      enY: (px) => y0 + ((alto - px) / alto) * (y1 - y0),
    };
  }
  
  /* Formato compacto para números de los ejes (sin ruido binario). */
  function fmtNum(n) {
    return String(Math.round(n * 1e6) / 1e6);
  }
  
  function svgEl(nombre, attrs = {}, padre = null) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", nombre);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) el.setAttribute(k, String(v));
    }
    if (padre) padre.appendChild(el);
    return el;
  }
  
  /* ══════════════════════════════════════════════════════════
     8 · TRAZADO EXPLÍCITO (muestreo píxel a píxel + cortes en
         NaN, saltos de asíntota — tan(x), 1/x, ln(x)… — y en los
         bordes del RECORTE pedido)
     Devuelve una lista de TRAMOS ([[px,px], …]); cada tramo es una
     polilínea continua. La variable puede ser x (y=f(x)) o y (x=f(y)).
     rec = { xMin, xMax, yMin, yMax } (lo que falte, abierto):
     · el eje de barrido (x para y=f(x), y para x=f(y)) solo se
       muestrea dentro de la porción;
     · el eje de valores (y para y=f(x), x para x=f(y)) CORTA el trazo
       justo en el borde: entre dos muestras se interpola el punto
       exacto donde la curva cruza el valor del recorte.
     ══════════════════════════════════════════════════════════ */
  
  function trazarExplicita(f, geo, esDeX, rec = {}) {
    const minT0 = esDeX ? geo.x0 : geo.y0;
    const maxT0 = esDeX ? geo.x1 : geo.y1;
    const uMin = esDeX ? rec.xMin : rec.yMin;
    const uMax = esDeX ? rec.xMax : rec.yMax;
    const minT = Number.isFinite(uMin) ? Math.max(minT0, uMin) : minT0;
    const maxT = Number.isFinite(uMax) ? Math.min(maxT0, uMax) : maxT0;
    if (!(maxT > minT)) return [];          /* porción fuera de la ventana */
    const vMin = esDeX ? rec.yMin : rec.xMin;
    const vMax = esDeX ? rec.yMax : rec.xMax;
    const rangoV = esDeX ? (geo.y1 - geo.y0) : (geo.x1 - geo.x0);
    const n = Math.max(32, Math.round((esDeX ? geo.ancho : geo.alto) / 1.5));
    const tramos = [];
    let actual = null;
    /* punto anterior (aunque quede FUERA de la porción: hace falta
       para interpolar el cruce exacto por el borde) */
    let pT = null, pV = 0, pDentro = true;
    const empujar = (u, v) => {
      const px = Math.max(-3 * geo.ancho, Math.min(4 * geo.ancho, esDeX ? geo.pxX(u) : geo.pxX(v)));
      const py = Math.max(-3 * geo.alto, Math.min(4 * geo.alto, esDeX ? geo.pxY(v) : geo.pxY(u)));
      if (!actual) { actual = []; tramos.push(actual); }
      actual.push([px, py]);
    };
    /* ¿por qué borde de la porción se salió este punto? */
    const topeDe = (val) => (Number.isFinite(vMax) && val > vMax) ? vMax : vMin;
    for (let k = 0; k <= n; k++) {
      const t = minT + (k / n) * (maxT - minT);
      let v;
      try { v = f(t); } catch (_) { v = NaN; }
      if (!Number.isFinite(v)) { actual = null; pT = null; pDentro = true; continue; }
      /* salto de asíntota: diferencia gigante Y ambos lados fuera de
         la ventana (una rama sube y la otra baja: tan(x), 1/x…). Un
         cambio brusco dentro de la ventana NO corta (y = 1000x pasa
         entera). */
      if (pT !== null &&
          Math.abs(v - pV) > 2.5 * rangoV &&
          Math.abs(pV) > rangoV && Math.abs(v) > rangoV) {
        actual = null;
      }
      const fuera = (Number.isFinite(vMin) && v < vMin) ||
                    (Number.isFinite(vMax) && v > vMax);
      if (fuera) {
        if (pT !== null && pDentro) {
          /* estaba dentro y salió: cerrar el trazo EXACTO en el borde */
          const tope = topeDe(v);
          empujar(pT + ((tope - pV) / (v - pV)) * (t - pT), tope);
          actual = null;
        }
        pDentro = false;
      } else {
        if (pT !== null && !pDentro) {
          /* venía de fuera: abrir el trazo EXACTO en el borde */
          const tope = topeDe(pV);
          actual = []; tramos.push(actual);
          empujar(pT + ((tope - pV) / (v - pV)) * (t - pT), tope);
        }
        empujar(t, v);
        pDentro = true;
      }
      pT = t; pV = v;
    }
    return tramos.filter((t) => t.length > 1);
  }
  
  /* ══════════════════════════════════════════════════════════
     9 · TRAZADO IMPLÍCITO — MARCHING SQUARES
     Malla fina sobre la ventana; en cada celda con cambio de signo
     de F se interpola el cruce por cero en las aristas. Es el método
     que dibuja con precisión cónicas y ecuaciones sin despejar.
     Devuelve segmentos [px1, py1, px2, py2], ya RECORTADOS a la
     porción pedida (rec) con el algoritmo LIANG–BARSKY: cada
     segmentito se corta exactamente en los bordes del recorte.
     ══════════════════════════════════════════════════════════ */
  
  function trazarImplicita(F, geo, rec = {}) {
    const pasoPx = 3;
    const nx = Math.max(8, Math.min(241, Math.round(geo.ancho / pasoPx) + 1));
    const ny = Math.max(8, Math.min(241, Math.round(geo.alto / pasoPx) + 1));
    const V = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      const y = geo.y0 + (j / (ny - 1)) * (geo.y1 - geo.y0);
      for (let i = 0; i < nx; i++) {
        const x = geo.x0 + (i / (nx - 1)) * (geo.x1 - geo.x0);
        let v;
        try { v = F(x, y); } catch (_) { v = NaN; }
        V[j * nx + i] = Number.isFinite(v) ? v : NaN;
      }
    }
    const segs = [];
    const cruce = (v1, v2) => v1 / (v1 - v2);
    /* caja de la porción (los ejes sin recorte quedan abiertos) */
    const rXmin = Number.isFinite(rec.xMin) ? rec.xMin : -Infinity;
    const rXmax = Number.isFinite(rec.xMax) ? rec.xMax : Infinity;
    const rYmin = Number.isFinite(rec.yMin) ? rec.yMin : -Infinity;
    const rYmax = Number.isFinite(rec.yMax) ? rec.yMax : Infinity;
    const hayRec = rXmin > -Infinity || rXmax < Infinity ||
                   rYmin > -Infinity || rYmax < Infinity;
    /* LIANG–BARSKY sobre coordenadas MATEMÁTICAS: recorta el segmento
       [a,b] a la caja de la porción. Los bordes con ±Infinity no
       recortan nada. Devuelve [x1,y1,x2,y2] o null si queda fuera. */
    const recortarSeguro = (a, b) => {
      let t0 = 0, t1 = 1;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const borde = (p, q) => {          /* p·t ≤ q */
        if (p === 0) return q >= 0;
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else       { if (r < t0) return false; if (r < t1) t1 = r; }
        return true;
      };
      if (!borde(-dx, a[0] - rXmin)) return null;   /* x ≥ rXmin */
      if (!borde(dx, rXmax - a[0])) return null;    /* x ≤ rXmax */
      if (!borde(-dy, a[1] - rYmin)) return null;   /* y ≥ rYmin */
      if (!borde(dy, rYmax - a[1])) return null;    /* y ≤ rYmax */
      return [a[0] + t0 * dx, a[1] + t0 * dy, a[0] + t1 * dx, a[1] + t1 * dy];
    };
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = V[j * nx + i];        // arriba-izquierda
        const b = V[j * nx + i + 1];    // arriba-derecha
        const c = V[(j + 1) * nx + i + 1]; // abajo-derecha
        const d = V[(j + 1) * nx + i];  // abajo-izquierda
        if (!Number.isFinite(a) || !Number.isFinite(b) ||
            !Number.isFinite(c) || !Number.isFinite(d)) continue;
        const idx = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const xA = geo.x0 + (i / (nx - 1)) * (geo.x1 - geo.x0);
        const xB = geo.x0 + ((i + 1) / (nx - 1)) * (geo.x1 - geo.x0);
        const yA = geo.y0 + (j / (ny - 1)) * (geo.y1 - geo.y0);
        const yB = geo.y0 + ((j + 1) / (ny - 1)) * (geo.y1 - geo.y0);
        const P = {};
        if ((idx & 12) === 8 || (idx & 12) === 4) P.t = [xA + cruce(a, b) * (xB - xA), yA];
        if ((idx & 6) === 4 || (idx & 6) === 2) P.r = [xB, yA + cruce(b, c) * (yB - yA)];
        if ((idx & 3) === 2 || (idx & 3) === 1) P.b = [xA + cruce(d, c) * (xB - xA), yB];
        if ((idx & 9) === 8 || (idx & 9) === 1) P.l = [xA, yA + cruce(a, d) * (yB - yA)];
        let pares;
        switch (idx) {
          case 1: case 14: pares = [["l", "b"]]; break;
          case 2: case 13: pares = [["b", "r"]]; break;
          case 3: case 12: pares = [["l", "r"]]; break;
          case 4: case 11: pares = [["t", "r"]]; break;
          case 6: case 9: pares = [["t", "b"]]; break;
          case 7: case 8: pares = [["l", "t"]]; break;
          /* casos ambiguos (dos diagonalmente +, dos −): decide el centro */
          case 5: pares = (a + b + c + d) / 4 < 0
            ? [["l", "t"], ["b", "r"]]
            : [["l", "b"], ["t", "r"]];
            break;
          case 10: pares = (a + b + c + d) / 4 < 0
            ? [["t", "r"], ["l", "b"]]
            : [["l", "t"], ["b", "r"]];
            break;
          default: continue;
        }
        for (const [p1, p2] of pares) {
          if (P[p1] && P[p2]) {
            const s = hayRec
              ? recortarSeguro(P[p1], P[p2])
              : [P[p1][0], P[p1][1], P[p2][0], P[p2][1]];
            if (s) segs.push([geo.pxX(s[0]), geo.pxY(s[1]), geo.pxX(s[2]), geo.pxY(s[3])]);
          }
        }
      }
    }
    return segs;
  }
  
  /* ══════════════════════════════════════════════════════════
     10 · ÁREAS — «entre» dos curvas, «region» por desigualdad
          (barrido de franjas) y «region» por rangos (franja de
          dominio, franja de rango o rectángulo)
     ══════════════════════════════════════════════════════════ */
  
  /* Línea de área «tipo | definición | rango | color» → objeto, o
     el objeto ya desglosado. Lanza Error con el motivo. */
  function parsearArea(item, indice) {
    const donde = "el área " + (indice + 1);
    if (typeof item === "string") {
      const partes = item.split("|").map((s) => s.trim());
      const tipo = quitarAcentos(partes[0] || "").toLowerCase();
      if (tipo !== "entre" && tipo !== "region") {
        throw new Error(donde + " empieza con «" + (partes[0] || "(vacía)") + "»: debe empezar con «entre» o «region» — ej: entre | y=x^2 ; y=0 | x=0..4 | #2563eb44");
      }
      const zona = { tipo };
      /* color al final (puede no venir); «entre» puede traer rango antes */
      const color = quitaColor(partes, esColorValido);
      if (tipo === "entre") {
        let rango = "";
        if (partes.length >= 3 && esSegmentoRango(partes[partes.length - 1])) rango = partes.pop();
        zona.curvas = partes.slice(1).join("|").split(";").map((s) => s.trim()).filter(Boolean);
        if (!zona.curvas.length) throw new Error(donde + " (entre) necesita las curvas — ej: entre | y=x^2 ; y=0 | x=0..4 | #2563eb44");
        if (zona.curvas.length > 2) throw new Error(donde + " admite máximo 2 curvas separadas por «;»");
        zona.rango = rango;
        zona.color = color;
      } else {
        let def = partes.slice(1).join("|").trim();
        if (!def) throw new Error(donde + " (region) necesita una desigualdad (y >= x^2) o un rango (x=-2..2)");
        if (/^(no|!)\s+/.test(def)) { zona.negar = true; def = def.replace(/^(no|!)\s+/, ""); }
        zona.definicion = def;
        zona.color = color;
      }
      item = zona;
    }
    const zona = { tipo: quitarAcentos(String(item.tipo || "")).toLowerCase() };
    if (zona.tipo !== "entre" && zona.tipo !== "region") {
      throw new Error(donde + ": el tipo debe ser «entre» o «region» (llegó «" + (item.tipo || "(vacío)") + "»)");
    }
    if (item.negar !== undefined) zona.negar = !!item.negar;
    if (item.color) zona.color = String(item.color);
  
    if (zona.tipo === "entre") {
      zona.curvas = (item.curvas || []).map(String);
      if (!zona.curvas.length) throw new Error(donde + " (entre) necesita su lista «curvas» — ej: [\"y=x^2\", \"y=0\"]");
      if (zona.curvas.length > 2) throw new Error(donde + " admite máximo 2 curvas");
      if (item.de !== undefined || item.a !== undefined) {
        zona.de = evaluarConstante(String(item.de ?? "-1e9"), "el inicio del área " + (indice + 1));
        zona.a = evaluarConstante(String(item.a ?? "1e9"), "el fin del área " + (indice + 1));
      } else if (typeof item.rango === "string" && item.rango.trim()) {
        const m = item.rango.trim().match(/^(?:x\s*=\s*)?(.+?)\.\.(.+)$/);
        if (!m) throw new Error(donde + ": el rango se escribe «x=de..a» — ej: x=0..4 (llegó «" + item.rango + "»)");
        zona.de = evaluarConstante(m[1], "el inicio del área " + (indice + 1));
        zona.a = evaluarConstante(m[2], "el fin del área " + (indice + 1));
      }
    } else if (item.desigualdad !== undefined) {
      zona.desigualdad = String(item.desigualdad);
    } else if (item.rangos !== undefined) {
      zona.rangos = String(item.rangos);
    } else if (typeof item.definicion === "string") {
      zona.definicion = item.definicion;
    }
    return zona;
  }
  
  /* Acotaciones «x:a,b; y:c» → líneas entrecortadas. Los valores son
     números o expresiones sin x/y (pi/2). */
  function parsearAcotaciones(texto, donde) {
    const salida = [];
    String(texto).split(";").map((s) => s.trim()).filter(Boolean).forEach((seg) => {
      const m = seg.match(/^([xy])\s*:\s*(.+)$/i);
      if (!m) throw new Error(donde + ": las acotaciones se escriben «x:a,b; y:c» (llegó «" + seg + "»)");
      const eje = m[1].toLowerCase();
      const vals = m[2].split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2);
      if (!vals.length) throw new Error(donde + ": la acotación «" + seg + "» no tiene valor");
      for (const v of vals) {
        salida.push({ eje, valor: evaluarConstante(v, "las acotaciones de " + donde) });
      }
    });
    return salida;
  }
  
  /* RECORTE «x:a,b; y:c,d» → la PORCIÓN de la curva que SÍ se dibuja.
     A diferencia de las acotaciones (que solo marcan la línea
     punteada), el recorte CORTA la curva: fuera de la porción no se
     traza nada y en los bordes el corte es EXACTO (se interpola el
     punto donde la curva cruza el valor dado). Cada eje lleva DOS
     valores — mínimo y máximo — que pueden ser expresiones (pi/2).
     Si llegan al revés se acomodan solos; el ancho cero no deja
     porción que dibujar y se avisa. */
  function normalizarRecorte(s, donde) {
    const sal = {};
    for (const eje of ["x", "y"]) {
      const a = s[eje + "Min"];
      const b = s[eje + "Max"];
      if (a === undefined && b === undefined) continue;
      if (a !== undefined && b !== undefined) {
        if (a === b) {
          throw new Error(donde + ": el recorte de " + eje + " repite el mismo valor (" + fmtNum(a) + ") — necesita el mínimo y el máximo distintos, ej: " + eje + ":0,4");
        }
        /* llegaron al revés: se acomodan solos */
        sal[eje + "Min"] = Math.min(a, b);
        sal[eje + "Max"] = Math.max(a, b);
      } else {
        /* OBJETO con un solo lado: se recorta solo de ese lado */
        sal[eje + (a !== undefined ? "Min" : "Max")] = a !== undefined ? a : b;
      }
    }
    return sal;
  }
  
  function parsearRecorte(texto, donde) {
    const t = String(texto ?? "").trim();
    if (!t) throw new Error(donde + ": el recorte está vacío — escribe «x:a,b» y/o «y:c,d» (mínimo y máximo de la porción), ej: x:0,4; y:2,8");
    const s = {};
    t.split(";").map((x) => x.trim()).filter(Boolean).forEach((seg) => {
      const m = seg.match(/^([xy])\s*:\s*(.+)$/i);
      if (!m) {
        throw new Error(donde + ": el recorte «" + seg + "» no se entiende — usa «x:a,b» y/o «y:c,d» (mínimo y máximo), ej: x:0,4; y:2,8");
      }
      const eje = m[1].toLowerCase();
      if (s[eje + "Min"] !== undefined || s[eje + "Max"] !== undefined) {
        throw new Error(donde + " repite el recorte de " + eje);
      }
      const vals = m[2].split(",").map((v) => v.trim()).filter(Boolean);
      if (vals.length !== 2) {
        throw new Error(donde + ": el recorte de " + eje + " necesita DOS valores (mínimo y máximo) — ej: " + eje + ":0,4");
      }
      s[eje + "Min"] = evaluarConstante(vals[0], "el recorte de " + donde);
      s[eje + "Max"] = evaluarConstante(vals[1], "el recorte de " + donde);
    });
    if (!Object.keys(s).length) {
      throw new Error(donde + ": el recorte está vacío — escribe «x:a,b» y/o «y:c,d» (mínimo y máximo de la porción), ej: x:0,4; y:2,8");
    }
    return normalizarRecorte(s, donde);
  }
  
  /* El recorte admite la LÍNEA «x:a,b; y:c,d» u el OBJETO
     { xMin, xMax, yMin, yMax } (con valores número o expresión, y
     permitiendo acotar UN solo lado). */
  function recorteDe(bruto, donde) {
    if (bruto === undefined || bruto === null) return {};
    if (typeof bruto === "object" && !Array.isArray(bruto)) {
      const s = {};
      for (const k of ["xMin", "xMax", "yMin", "yMax"]) {
        const v = bruto[k];
        if (v === undefined || v === null || String(v).trim() === "") continue;
        s[k] = evaluarConstante(String(v), "el recorte de " + donde);
      }
      return normalizarRecorte(s, donde);
    }
    return parsearRecorte(String(bruto), donde);
  }
  
  /* Puntos «A(2,3) | color» u objeto { letra, x, y, color }.
     La letra sale en MAYÚSCULA; coordenadas sin x ni y. */
  function parsearPunto(item, i) {
    const donde = "el punto " + (i + 1);
    let letra, xTxt, yTxt, colorTxt = "";
    if (typeof item === "string") {
      const partes = item.split("|").map((s) => s.trim());
      const color = quitaColor(partes, esColorValido);
      const m = partes.join("|").match(/^([A-Za-z])\s*\(\s*(.+?)\s*[;,]\s*(.+?)\s*\)$/);
      if (!m) throw new Error(donde + " no se entiende — formato: A(2,3) | color (UNA letra y las coordenadas x,y)");
      letra = m[1];
      xTxt = m[2];
      yTxt = m[3];
      colorTxt = color;
    } else if (item && typeof item === "object") {
      letra = String(item.letra ?? "").trim();
      xTxt = String(item.x ?? "").trim();
      yTxt = String(item.y ?? "").trim();
      colorTxt = item.color !== undefined ? String(item.color) : "";
    } else {
      throw new Error(donde + " no se entiende — formato: A(2,3) | color");
    }
    if (!/^[A-Za-z]$/.test(letra)) throw new Error(donde + " necesita UNA letra para el nombre — ej: A(2,3)");
    if (/[;,]/.test(xTxt) || /,/.test(yTxt)) {
      throw new Error(donde + " lleva coordenadas de más: solo x,y — ej: A(2,3)");
    }
    return {
      letra: letra.toUpperCase(),
      x: evaluarConstante(xTxt, "las coordenadas de " + donde),
      y: evaluarConstante(yTxt, "las coordenadas de " + donde),
      color: colorTxt ? leerColor(colorTxt, donde) : null,
    };
  }
  
  /* Deja el área LISTA para dibujar: curvas compiladas (despejadas
     en y), desigualdad compilada o rectángulo resuelto. */
  function prepararArea(zona, geo, indice) {
    const donde = "el área " + (indice + 1);
    const base = {
      tipo: zona.tipo,
      negar: !!zona.negar,
      color: zona.color ? leerColor(zona.color, donde) : null,
    };
    if (zona.tipo === "entre") {
      const fs = zona.curvas.map((c) => {
        const a = analizarEcuacion(c);
        if (a.tipo !== "fx") {
          throw new Error(donde + ": para «entre» las curvas van despejadas en y — ej: y=x^2 (llegó «" + c + "»)");
        }
        return a.f;
      });
      let de = zona.de === undefined ? geo.x0 : zona.de;
      let a = zona.a === undefined ? geo.x1 : zona.a;
      if (de > a) { const tmp = de; de = a; a = tmp; }
      return { ...base, f1: fs[0], f2: fs[1] || null, de, a };
    }
    let def = zona.desigualdad ?? zona.rangos ?? zona.definicion;
    if (def === undefined || !String(def).trim()) {
      throw new Error(donde + " (region) necesita una desigualdad (y >= x^2) o un rango (x=-2..2)");
    }
    def = String(def).trim();
    /* ¿desigualdad o rangos? Los rangos SIEMPRE llevan «..» */
    if (/[<>]/.test(def)) {
      const arbol = arbolDe(def);
      if (!arbol.comp) {
        throw new Error(donde + ": desigualdad incompleta — ej: y >= x^2");
      }
      const gi = compilar(arbol.izq);
      const gd = compilar(arbol.der);
      return { ...base, F: (x, y) => gi(x, y) - gd(x, y), comp: arbol.comp };
    }
    if (/=/.test(def) && !/\.\./.test(def)) {
      throw new Error(donde + ": en «region» la igualdad no se colorea — usa una desigualdad (>=, >, <=, <) o un rango (x=a..b)");
    }
    const rect = {};
    const partes = def.split(",").map((s) => s.trim()).filter(Boolean);
    for (const p of partes) {
      const m = p.match(/^([xy])\s*=\s*(.+?)\.\.(.+)$/);
      if (!m) throw new Error(donde + ": el rango se escribe «x=de..a» o «y=de..a», separados por coma (llegó «" + p + "»)");
      const eje = m[1];
      if (rect[eje]) throw new Error(donde + " repite el rango de " + eje);
      const v1 = evaluarConstante(m[2], donde);
      const v2 = evaluarConstante(m[3], donde);
      if (!(v2 > v1)) throw new Error(donde + ": en " + eje + " el fin debe ser mayor que el inicio (" + fmtNum(v1) + " .. " + fmtNum(v2) + ")");
      rect[eje] = [v1, v2];
    }
    if (!rect.x && !rect.y) {
      throw new Error(donde + " (region) necesita una desigualdad (y >= x^2) o un rango (x=-2..2)");
    }
    return { ...base, rect };
  }
  
  /* Rectángulo (o franja) recortado a la ventana → [px, py, w, h]. */
  function rectanguloDe(rect, geo) {
    const xa = rect.x ? Math.max(geo.x0, Math.min(geo.x1, rect.x[0])) : geo.x0;
    const xb = rect.x ? Math.max(geo.x0, Math.min(geo.x1, rect.x[1])) : geo.x1;
    const ya = rect.y ? Math.max(geo.y0, Math.min(geo.y1, rect.y[0])) : geo.y0;
    const yb = rect.y ? Math.max(geo.y0, Math.min(geo.y1, rect.y[1])) : geo.y1;
    if (!(xb > xa) || !(yb > ya)) return null;
    const px = geo.pxX(xa);
    const py = geo.pxY(yb);
    return [px, py, geo.pxX(xb) - px, geo.pxY(ya) - py];
  }
  
  /* ── utilidades de dibujo ── */
  
  function rutaDeTramos(tramos) {
    let d = "";
    for (const tramo of tramos) {
      d += "M" + tramo[0][0].toFixed(2) + " " + tramo[0][1].toFixed(2);
      for (let k = 1; k < tramo.length; k++) {
        d += "L" + tramo[k][0].toFixed(2) + " " + tramo[k][1].toFixed(2);
      }
    }
    return d;
  }
  
  /* Sombreado por barrido de franjas: celdas de ~2.6 px donde la
     desigualdad se cumple, unidas en renglones horizontales. */
  function rutaDeDesigualdad(F, comp, negar, geo) {
    const nx = Math.min(280, Math.max(40, Math.round(geo.ancho / 2.6)));
    const ny = Math.min(280, Math.max(40, Math.round(geo.alto / 2.6)));
    const wC = geo.ancho / nx;
    const hC = geo.alto / ny;
    const cumpleComp = (v) => (comp === ">" ? v > 0 : comp === ">=" ? v >= 0 : comp === "<" ? v < 0 : v <= 0);
    let d = "";
    for (let j = 0; j < ny; j++) {
      const y = geo.enY((j + 0.5) * hC);
      let ini = null;
      for (let i = 0; i <= nx; i++) {
        let cumple = false;
        if (i < nx) {
          const x = geo.enX((i + 0.5) * wC);
          let v;
          try { v = F(x, y); } catch (_) { v = NaN; }
          if (Number.isFinite(v)) cumple = negar ? !cumpleComp(v) : cumpleComp(v);
        }
        if (cumple && ini === null) ini = i * wC;
        if (!cumple && ini !== null) {
          const w = i * wC - ini;
          d += "M" + ini.toFixed(1) + " " + (j * hC).toFixed(1) +
               "h" + w.toFixed(1) + "v" + hC.toFixed(1) + "h" + (-w).toFixed(1) + "z";
          ini = null;
        }
      }
    }
    return d;
  }
  
  /* Polígono entre dos curvas (o entre curva y eje X) en [de, a]. */
  function rutaEntre(f1, f2, de, a, geo) {
    const xA = Math.max(geo.x0, Math.min(geo.x1, de));
    const xB = Math.max(geo.x0, Math.min(geo.x1, a));
    if (!(xB > xA)) return "";
    const n = Math.max(16, Math.round(((xB - xA) / (geo.x1 - geo.x0)) * geo.ancho / 2));
    const yBase = Math.max(geo.y0, Math.min(geo.y1, 0));
    let d = "";
    let abiertos = [];
    const cerrar = () => {
      if (abiertos.length < 2) { abiertos = []; return; }
      d += "M" + abiertos[0].map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L");
      d += "L" + abiertos[1].slice().reverse().map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + "Z";
      abiertos = [];
    };
    for (let k = 0; k <= n; k++) {
      const x = xA + (k / n) * (xB - xA);
      let v1, v2 = yBase;
      try { v1 = f1(x); } catch (_) { v1 = NaN; }
      if (f2) { try { v2 = f2(x); } catch (_) { v2 = NaN; } }
      if (!Number.isFinite(v1) || (f2 && !Number.isFinite(v2))) { cerrar(); continue; }
      if (!abiertos.length) abiertos = [[], []];
      abiertos[0].push([geo.pxX(x), geo.pxY(v1)]);
      abiertos[1].push([geo.pxX(x), geo.pxY(v2)]);
    }
    cerrar();
    return d;
  }
  
  /* ══════════════════════════════════════════════════════════
     11 · LA FUNCIÓN PRINCIPAL
     ══════════════════════════════════════════════════════════ */
  
  function destinoPrincipal() {
    return document.querySelector("main") || document.getElementById("app") || document.body;
  }
  
  /* Punto de la curva donde se escribe la ecuación (que quede DENTRO
     de la ventana, DENTRO de la porción recortada y lejos de las
     orillas). */
  function anclaDeEtiqueta(fn2, geo) {
    const margen = 0.05;
    const rec = fn2.rec || {};
    if (fn2.tipo === "fx") {
      /* solo se busca dentro de la porción visible */
      const ax0 = Number.isFinite(rec.xMin) ? Math.max(geo.x0, rec.xMin) : geo.x0;
      const ax1 = Number.isFinite(rec.xMax) ? Math.min(geo.x1, rec.xMax) : geo.x1;
      if (!(ax1 > ax0)) return null;
      for (const fr of [0.62, 0.38, 0.75, 0.25, 0.5, 0.85, 0.15]) {
        const x = ax0 + fr * (ax1 - ax0);
        let y;
        try { y = fn2.f(x); } catch (_) { continue; }
        const enRec = (!Number.isFinite(rec.yMin) || y >= rec.yMin) &&
                      (!Number.isFinite(rec.yMax) || y <= rec.yMax);
        if (Number.isFinite(y) && enRec &&
            y >= geo.y0 + margen * (geo.y1 - geo.y0) &&
            y <= geo.y1 - margen * (geo.y1 - geo.y0)) {
          return [geo.pxX(x), geo.pxY(y)];
        }
      }
      return null;
    }
    if (fn2.tipo === "fy") {
      const ay0 = Number.isFinite(rec.yMin) ? Math.max(geo.y0, rec.yMin) : geo.y0;
      const ay1 = Number.isFinite(rec.yMax) ? Math.min(geo.y1, rec.yMax) : geo.y1;
      if (!(ay1 > ay0)) return null;
      for (const fr of [0.62, 0.38, 0.75, 0.25, 0.5]) {
        const y = ay0 + fr * (ay1 - ay0);
        let x;
        try { x = fn2.f(y); } catch (_) { continue; }
        const enRec = (!Number.isFinite(rec.xMin) || x >= rec.xMin) &&
                      (!Number.isFinite(rec.xMax) || x <= rec.xMax);
        if (Number.isFinite(x) && enRec &&
            x >= geo.x0 + margen * (geo.x1 - geo.x0) &&
            x <= geo.x1 - margen * (geo.x1 - geo.x0)) {
          return [geo.pxX(x), geo.pxY(y)];
        }
      }
      return null;
    }
    const segs = fn2.segs || [];
    const dentro = segs.find((s) =>
      s[0] >= geo.ancho * 0.3 && s[0] <= geo.ancho * 0.78 &&
      s[1] >= geo.alto * 0.15 && s[1] <= geo.alto * 0.78);
    if (dentro) return [dentro[0], dentro[1]];
    return segs.length ? [segs[0][0], segs[0][1]] : null;
  }
  
  export function dibujarGraficadorCartesiano(configuracion = {}) {
    const cfg = configuracion || {};
    const geo = construirGeo(cfg);
    const conEtiquetas = cfg.etiquetas === undefined ? true : !!cfg.etiquetas;
  
    /* ── funciones: línea «ecuación | color | acotaciones | recorte»
          u objeto { ecuacion, color, acotaciones, recorte } ── */
    const funciones = [];
    (Array.isArray(cfg.funciones) ? cfg.funciones : []).forEach((item, i) => {
      const donde = "la función " + (i + 1);
      let ecuacion = "", colorTxt = "", acotTxt = "", recBruto;
      if (typeof item === "string") {
        const partes = item.split("|").map((s) => s.trim());
        /* se lee del FINAL: recorte → acotaciones → color → ecuación */
        if (partes.length >= 2 && esSegRecorte(partes[partes.length - 1])) {
          recBruto = partes.pop().replace(/^recorte\s*:?/i, "").trim();
        }
        if (partes.length >= 2 && esSegmentoAcot(partes[partes.length - 1])) acotTxt = partes.pop();
        colorTxt = quitaColor(partes, esColorValido);
        /* lo que quedó sin color válido y con la ecuación ya completa
           era un color mal escrito (ej: «y=x^2 | colorfalso») */
        if (partes.length === 2) {
          let laPrimeraSirve = false;
          try { analizarEcuacion(partes[0]); laPrimeraSirve = true; } catch (_) { /* barras |x|: sigue junta */ }
          if (laPrimeraSirve) {
            throw new Error(donde + ": no entiendo el color «" + partes[1] + "» — usa hex (#e74c3c) o nombre (rojo, azul, verde…)");
          }
        }
        ecuacion = partes.join("|").trim();
      } else if (item && typeof item === "object") {
        ecuacion = String(item.ecuacion ?? "");
        colorTxt = item.color !== undefined ? String(item.color) : "";
        acotTxt = item.acotaciones !== undefined ? String(item.acotaciones) : "";
        recBruto = item.recorte;
      } else {
        ecuacion = String(item ?? "");
      }
      if (!ecuacion.trim()) throw new Error(donde + " no tiene ecuación — ej: y = x^2");
      const a = analizarEcuacion(ecuacion);
      funciones.push({
        ...a,
        color: colorDeLista(colorTxt, i),
        acotaciones: acotTxt.trim() ? parsearAcotaciones(acotTxt, donde) : [],
        rec: recorteDe(recBruto, donde),
        segs: null,
      });
    });
  
    /* ── áreas y puntos ── */
    const areas = (Array.isArray(cfg.areas) ? cfg.areas : [])
      .map((z, i) => prepararArea(parsearArea(z, i), geo, i));
    const puntos = (Array.isArray(cfg.puntos) ? cfg.puntos : [])
      .map((p, i) => parsearPunto(p, i));
  
    /* ── svg raíz ── */
    const svg = svgEl("svg", {
      viewBox: "0 0 " + geo.ancho + " " + geo.alto,
      role: "img",
      "aria-label": "Plano cartesiano" +
        (funciones.length ? " con " + funciones.length + " gráfica(s)" : " sin gráficas"),
      style: "display:block;width:100%;max-width:" + geo.ancho +
        "px;height:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:.5rem",
    });
    svgEl("rect", { x: 0, y: 0, width: geo.ancho, height: geo.alto, fill: "#ffffff" }, svg);
  
    /* ORDEN ESTRICTO DE CAPAS */
    const gZonas = svgEl("g", { "data-capa": "zonas" }, svg);           // 1
    const gGrid = svgEl("g", { "data-capa": "cuadricula" }, svg);       // 2
    const gEjes = svgEl("g", { "data-capa": "ejes" }, svg);             // 3
    const gAcot = svgEl("g", { "data-capa": "acotaciones" }, svg);      // 4
    const gCurvas = svgEl("g", { "data-capa": "curvas" }, svg);         // 5
    const gPuntos = svgEl("g", { "data-capa": "puntos" }, svg);         // 6
    const gEtiq = svgEl("g", { "data-capa": "etiquetas" }, svg);        // 7
  
    /* ── CAPA 1 · zonas coloreadas (semitono) ── */
    for (const zona of areas) {
      const alfa = zona.color && zona.color.alfa !== 1 ? zona.color.alfa : 0.28;
      const hex = zona.color ? zona.color.hex : "#94a3b8";
      const pinta = (d) => {
        if (!d) return;
        svgEl("path", { d, fill: hex, "fill-opacity": alfa, stroke: "none" }, gZonas);
      };
      if (zona.tipo === "entre") {
        pinta(rutaEntre(zona.f1, zona.f2, zona.de, zona.a, geo));
      } else if (zona.F) {
        pinta(rutaDeDesigualdad(zona.F, zona.comp, zona.negar, geo));
      } else {
        const r = rectanguloDe(zona.rect, geo);
        if (zona.negar && r) {
          /* «no dominio»: toda la ventana MENOS el rectángulo */
          const [rx, ry, rw, rh] = r;
          const bandas = [
            [0, 0, geo.ancho, ry],
            [0, ry + rh, geo.ancho, geo.alto - ry - rh],
            [0, ry, rx, rh],
            [rx + rw, ry, geo.ancho - rx - rw, rh],
          ];
          for (const b of bandas) {
            if (b[2] > 0 && b[3] > 0) {
              svgEl("rect", { x: b[0], y: b[1], width: b[2], height: b[3], fill: hex, "fill-opacity": alfa }, gZonas);
            }
          }
        } else if (r) {
          svgEl("rect", { x: r[0], y: r[1], width: r[2], height: r[3], fill: hex, "fill-opacity": alfa }, gZonas);
        }
      }
    }
  
    /* ── CAPA 2 · cuadrícula según la escala (visible, no fantasma) ── */
    {
      const paso = geo.escala;
      const kX0 = Math.ceil(geo.x0 / paso - 1e-9);
      const kX1 = Math.floor(geo.x1 / paso + 1e-9);
      const kY0 = Math.ceil(geo.y0 / paso - 1e-9);
      const kY1 = Math.floor(geo.y1 / paso + 1e-9);
      if (kX1 - kX0 <= 400 && kY1 - kY0 <= 400) {
        for (let k = kX0; k <= kX1; k++) {
          const px = Math.round(geo.pxX(k * paso)) + 0.5;
          svgEl("line", { x1: px, y1: 0, x2: px, y2: geo.alto, stroke: "#8fa3ba", "stroke-opacity": 0.5, "stroke-width": 1 }, gGrid);
        }
        for (let k = kY0; k <= kY1; k++) {
          const py = Math.round(geo.pxY(k * paso)) + 0.5;
          svgEl("line", { x1: 0, y1: py, x2: geo.ancho, y2: py, stroke: "#8fa3ba", "stroke-opacity": 0.5, "stroke-width": 1 }, gGrid);
        }
      }
    }
  
    /* ── CAPA 3 · ejes NEGROS con flechas y números ── */
    {
      const ejeYVisible = geo.x0 <= 0 && geo.x1 >= 0;
      const ejeXVisible = geo.y0 <= 0 && geo.y1 >= 0;
      if (ejeXVisible) {
        const py = Math.round(geo.pxY(0)) + 0.5;
        svgEl("line", { x1: 0, y1: py, x2: geo.ancho, y2: py, stroke: "#000000", "stroke-width": 2 }, gEjes);
        svgEl("path", { d: "M" + (geo.ancho - 1) + " " + py + "L" + (geo.ancho - 11) + " " + (py - 4.5) + "L" + (geo.ancho - 11) + " " + (py + 4.5) + "Z", fill: "#000000" }, gEjes);
        svgEl("path", { d: "M1 " + py + "L11 " + (py - 4.5) + "L11 " + (py + 4.5) + "Z", fill: "#000000" }, gEjes);
      }
      if (ejeYVisible) {
        const px = Math.round(geo.pxX(0)) + 0.5;
        svgEl("line", { x1: px, y1: 0, x2: px, y2: geo.alto, stroke: "#000000", "stroke-width": 2 }, gEjes);
        svgEl("path", { d: "M" + px + " 1L" + (px - 4.5) + " 11L" + (px + 4.5) + " 11Z", fill: "#000000" }, gEjes);
        svgEl("path", { d: "M" + px + " " + (geo.alto - 1) + "L" + (px - 4.5) + " " + (geo.alto - 11) + "L" + (px + 4.5) + " " + (geo.alto - 11) + "Z", fill: "#000000" }, gEjes);
      }
      /* números según la escala (más espaciados si no caben todos) */
      const paso = geo.escala;
      const kX0 = Math.ceil(geo.x0 / paso - 1e-9);
      const kX1 = Math.floor(geo.x1 / paso + 1e-9);
      const kY0 = Math.ceil(geo.y0 / paso - 1e-9);
      const kY1 = Math.floor(geo.y1 / paso + 1e-9);
      const sepX = (paso / (geo.x1 - geo.x0)) * geo.ancho;
      const sepY = (paso / (geo.y1 - geo.y0)) * geo.alto;
      const saltoX = Math.max(1, Math.ceil(26 / Math.max(sepX, 0.001)));
      const saltoY = Math.max(1, Math.ceil(22 / Math.max(sepY, 0.001)));
      const yLinea = ejeXVisible ? geo.pxY(0) : geo.alto;
      const yTxt = Math.min(geo.alto - 4, yLinea + 15);
      for (let k = kX0; k <= kX1; k++) {
        if (k === 0 || (((k % saltoX) + saltoX) % saltoX) !== 0) continue;
        svgEl("text", {
          x: geo.pxX(k * paso), y: yTxt, "text-anchor": "middle",
          "font-size": 11, fill: "#000000", "font-family": "system-ui, sans-serif",
        }, gEjes).textContent = fmtNum(k * paso);
      }
      const xLinea = ejeYVisible ? geo.pxX(0) : 0;
      const alFinal = ejeYVisible && xLinea > 40;
      const xTxt = ejeYVisible ? (alFinal ? xLinea - 7 : xLinea + 6) : 5;
      for (let k = kY0; k <= kY1; k++) {
        if (k === 0 || (((k % saltoY) + saltoY) % saltoY) !== 0) continue;
        svgEl("text", {
          x: xTxt, y: geo.pxY(k * paso) + 3.5, "text-anchor": ejeYVisible && alFinal ? "end" : "start",
          "font-size": 11, fill: "#000000", "font-family": "system-ui, sans-serif",
        }, gEjes).textContent = fmtNum(k * paso);
      }
      if (ejeXVisible && ejeYVisible) {
        svgEl("text", {
          x: geo.pxX(0) - 5, y: geo.pxY(0) + 15, "text-anchor": "end",
          "font-size": 11, fill: "#000000", "font-family": "system-ui, sans-serif",
        }, gEjes).textContent = "0";
      }
    }
  
    /* ── CAPA 4 · acotaciones: líneas ENTRECORTADAS (límites y
          asíntotas) — deduplicadas entre funciones ── */
    {
      const vistas = new Set();
      for (const fn2 of funciones) {
        for (const a of fn2.acotaciones) {
          const llave = a.eje + ":" + a.valor.toFixed(6);
          if (vistas.has(llave)) continue;
          vistas.add(llave);
          if (a.eje === "x") {
            if (a.valor < geo.x0 - 1e-9 || a.valor > geo.x1 + 1e-9) continue;
            const px = Math.round(geo.pxX(a.valor)) + 0.5;
            svgEl("line", { x1: px, y1: 0, x2: px, y2: geo.alto, stroke: "#475569", "stroke-width": 1.6, "stroke-dasharray": "8 5" }, gAcot);
            const alFinal = px > geo.ancho - 80;
            svgEl("text", {
              x: alFinal ? px - 5 : px + 5, y: 13, "text-anchor": alFinal ? "end" : "start",
              "font-size": 10.5, "font-style": "italic", fill: "#475569",
              "font-family": "system-ui, sans-serif",
            }, gAcot).textContent = "x = " + fmtNum(a.valor);
          } else {
            if (a.valor < geo.y0 - 1e-9 || a.valor > geo.y1 + 1e-9) continue;
            const py = Math.round(geo.pxY(a.valor)) + 0.5;
            svgEl("line", { x1: 0, y1: py, x2: geo.ancho, y2: py, stroke: "#475569", "stroke-width": 1.6, "stroke-dasharray": "8 5" }, gAcot);
            const arriba = py > 18;
            svgEl("text", {
              x: geo.ancho - 5, y: arriba ? py - 6 : py + 13, "text-anchor": "end",
              "font-size": 10.5, "font-style": "italic", fill: "#475569",
              "font-family": "system-ui, sans-serif",
            }, gAcot).textContent = "y = " + fmtNum(a.valor);
          }
        }
      }
    }
  
    /* ── CAPA 5 · curvas continuas, cada una en SU color y RECORTADAS
          a la porción pedida ── */
    for (const fn2 of funciones) {
      let d = "";
      if (fn2.tipo === "fx") {
        d = rutaDeTramos(trazarExplicita(fn2.f, geo, true, fn2.rec));
      } else if (fn2.tipo === "fy") {
        d = rutaDeTramos(trazarExplicita(fn2.f, geo, false, fn2.rec));
      } else {
        fn2.segs = trazarImplicita(fn2.f, geo, fn2.rec);
        d = fn2.segs.map((s) =>
          "M" + s[0].toFixed(2) + " " + s[1].toFixed(2) +
          "L" + s[2].toFixed(2) + " " + s[3].toFixed(2)).join("");
      }
      if (!d) continue;
      svgEl("path", {
        d, fill: "none", stroke: fn2.color.hex, "stroke-width": 2.4,
        "stroke-linecap": "round", "stroke-linejoin": "round",
      }, gCurvas);
    }
  
    /* ── CAPA 6 · puntos con letra MAYÚSCULA ── */
    for (const p of puntos) {
      if (p.x < geo.x0 || p.x > geo.x1 || p.y < geo.y0 || p.y > geo.y1) continue;
      const px = geo.pxX(p.x);
      const py = geo.pxY(p.y);
      const hex = p.color ? p.color.hex : PALETA[p.letra.charCodeAt(0) % PALETA.length];
      svgEl("circle", { cx: px, cy: py, r: 4.6, fill: hex, stroke: "#ffffff", "stroke-width": 1.6 }, gPuntos);
      const alFinal = px > geo.ancho - 30;
      const arriba = py > 22;
      svgEl("text", {
        x: alFinal ? px - 9 : px + 9,
        y: arriba ? py - 9 : py + 17,
        "text-anchor": alFinal ? "end" : "start",
        "font-size": 13, "font-weight": "700", fill: hex,
        stroke: "#ffffff", "stroke-width": 3.5, "paint-order": "stroke",
        "stroke-linejoin": "round", "font-family": "system-ui, sans-serif",
      }, gPuntos).textContent = p.letra;
    }
  
    /* ── CAPA 7 · etiquetas: la ECUACIÓN junto a su gráfica ── */
    if (conEtiquetas) {
      for (const fn2 of funciones) {
        const ancla = anclaDeEtiqueta(fn2, geo);
        if (!ancla) continue;
        const alFinal = ancla[0] > geo.ancho * 0.6;
        svgEl("text", {
          x: Math.min(geo.ancho - 6, Math.max(6, alFinal ? ancla[0] - 8 : ancla[0] + 8)),
          y: Math.min(geo.alto - 6, Math.max(14, ancla[1] - 8)),
          "text-anchor": alFinal ? "end" : "start",
          "font-size": 12.5, "font-style": "italic", "font-weight": "600",
          fill: fn2.color.hex, stroke: "#ffffff", "stroke-width": 4,
          "paint-order": "stroke", "stroke-linejoin": "round",
          "font-family": "system-ui, sans-serif",
        }, gEtiq).textContent = fn2.etiqueta;
      }
    }
  
    /* ── destino ── */
    const destino = (cfg.contenedor && typeof cfg.contenedor.appendChild === "function")
      ? cfg.contenedor
      : destinoPrincipal();
    if (destino) destino.appendChild(svg);
    return svg;
  }
  
  /* ══════════════════════════════════════════════════════════
     EJEMPLO EJECUTABLE — una PARÁBOLA RECORTADA a su porción
     (solo se dibuja entre x=0 y x=4), una RECTA recortada por
     valores de Y (solo se dibuja donde y vale entre 2 y 8), una
     ZONA DE DOMINIO coloreada y LÍMITES con líneas entrecortadas
     (más el vértice como punto con letra). Para verlo, sirve la
     carpeta public/ y abre una página con:
  
     <script type="module">
       import { dibujarGraficadorCartesiano }
         from "./recursos/js/visuales/graficador-funciones-cartesianas.js";
  
       dibujarGraficadorCartesiano({
         rango: { xMin: -6, xMax: 8, yMin: -4, yMax: 10 },
         escala: 1,                        // cuadrícula de 1 en 1
         cuadrantes: [1, 2, 3, 4],
         funciones: [
           { ecuacion: "y = (x - 2)^2 + 1", color: "rojo",
             acotaciones: "x:0,4; y:1",    // límites entrecortados
             recorte: "x:0,4" },           // SOLO esa porción de X
           { ecuacion: "y = 6 - x", color: "azul",
             recorte: "y:2,8" },           // SOLO donde y está entre 2 y 8
         ],
         areas: [
           { tipo: "region", rangos: "x=0..4", color: "#2563eb33" }, // dominio
         ],
         puntos: [{ letra: "V", x: 2, y: 1, color: "morado" }],
         etiquetas: true,
       });
     </script>
  
     La misma configuración en formato de LÍNEAS (como la guarda el
     editor «Crear»):
       funciones: ["y = (x - 2)^2 + 1 | rojo | x:0,4; y:1 | recorte x:0,4",
                   "y = 6 - x | azul | recorte y:2,8"]
       areas:     ["region | x=0..4 | #2563eb33"]
       puntos:    ["V(2,1) | morado"]
     ══════════════════════════════════════════════════════════ */