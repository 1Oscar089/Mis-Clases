// ============================================================
// ciencias/tablaPeriodica.js — Util: TABLA PERIÓDICA interactiva
// (js/utils/ciencias/tablaPeriodica.js)   ·   v1
//
// Muestra la TABLA PERIÓDICA COMPLETA de los 118 elementos: los
// 18 grupos y los 7 periodos numerados, los metales de transición
// en su sitio y las series internas (lantánidos y actínidos) en
// sus DOS filas de abajo. Cada celda lleva SOLO cuatro datos:
//
//   · el NÚMERO ATÓMICO (arriba a la izquierda)
//   · el PESO ATÓMICO COMPLETO (arriba a la derecha; los
//     elementos sin isótopo estable van entre paréntesis,
//     ej: (98) el tecnecio)
//   · el SÍMBOLO (grande, al centro)
//   · el NOMBRE (abajo, en el idioma de la tabla)
//
// Los COLORES de cada celda se adaptan solos a la familia del
// elemento (la misma gama que usa la tarjeta química):
//   alcalinos        → rojo intenso   (#e53935)
//   alcalinotérreos  → naranja        (#fb8c00)
//   transición       → amarillo/gris  (#f9a825)
//   lantánidos       → marrón         (#8d6e63)
//   actínidos        → violeta        (#7b1fa2)
//   otros metales    → verde azulado  (#00897b)
//   metaloides       → verde oliva    (#7cb342)
//   no metales       → azul claro     (#039be5)
//   halógenos        → morado         (#9c27b0)
//   gases nobles     → rosa/magenta   (#d81b60)
// (debajo de la tabla va una LEYENDA con las 10 familias).
//
// AL PULSAR UN ELEMENTO se abre un MODAL (con ✕, Esc o clic en el
// fondo para salir) con la TARJETA QUÍMICA de ese elemento: la
// misma tarjeta cuadrada del visual
// recursos/js/visuales/ciencias/tarjetaElementoQuimico.js —
// masa exacta y aproximada (2 decimales), protones-electrones-
// neutrones, periodo, grupo, bloque s/p/d/f, familia, estados de
// oxidación y configuraciones completa/reducida. La tarjeta se
// carga por import() desde ese archivo (UNA sola vez); si el
// archivo no estuviera, el modal muestra una ficha básica con los
// datos que la tabla ya tiene, para no quedarse muda.
//
// Todo el HTML/CSS es NATIVO (sin librerías): la tabla escala con
// el ancho del contenedor (container queries, unidades cqw), así
// que se ve completa en la lámina de una clase, en la vista
// previa del editor «Crear» o en el celular sin deformarse.
//
// ─── PARÁMETROS (objeto de opciones; ninguno obligatorio) ───
//   idioma      «español» (defecto) o «english»: el idioma de los
//               nombres de la tabla, la leyenda y las tarjetas.
//   contenedor  HTMLElement o selector: la tabla se agrega ahí
//               (así la usan el editor «Crear» y las páginas
//               generadas). SIN contenedor se construye y se
//               muestra DIRECTAMENTE centrada en el <body>.
//   ancho       Ancho máximo de la tabla en px. (Defecto: 1280;
//               si el contenedor es más angosto, encoge sola.)
//
// ─── DEVUELVE ───
//   El elemento .tp-escena (con data-idioma), ya insertado en el
//   contenedor pedido o centrado en el <body>.
//
// USO DESDE UNA CLASE (contenido):
//   import { tablaPeriodica } from "../../../js/utils/ciencias/tablaPeriodica.js";
//
//   tablaPeriodica({ contenedor: zona });                        // en español
//   tablaPeriodica({ idioma: "english", contenedor: zona });     // en inglés
//   tablaPeriodica();                                            // centrada en el body
// ============================================================

/* ---------------- CSS implícito (inyectado UNA sola vez) ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "visuales-tabla-periodica-estilos";
  estilo.textContent = `
    /* Envoltura para mostrar la tabla CENTRADA en el <body> */
    .tp-caja {
      display: flex; align-items: center; justify-content: center;
      width: 100%; min-height: 100vh; min-height: 100svh;
      padding: 26px 14px; box-sizing: border-box;
    }
    /* Escena = contenedor de la tabla; TODO lo de adentro se mide
       en cqw (1 cqw = 1% del ancho de la escena), así la tabla
       completa escala junta en cualquier lámina o pantalla. */
    .tp-escena {
      container-type: inline-size;
      width: 100%; max-width: var(--tp-ancho, 1280px); margin: 0;
      font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1b2637;
    }
    .tp-escena * { box-sizing: border-box; margin: 0; padding: 0; font-family: inherit; }

    /* ── Rejilla: 1 col/row de rótulos + 18×7 + hueco + 2 series f ── */
    .tp-tabla {
      display: grid;
      grid-template-columns: repeat(19, minmax(0, 1fr));
      grid-template-rows: max-content repeat(7, max-content) max-content max-content max-content;
      gap: max(0.28cqw, 2px);
    }
    .tp-grupo, .tp-periodo {
      display: flex; align-items: center; justify-content: center;
      font-size: max(1.15cqw, 7px); font-weight: 700; color: #64748b;
      font-variant-numeric: tabular-nums; user-select: none;
    }
    .tp-separador { grid-column: 1 / -1; height: 1.7cqw; }

    /* ── Celda de elemento: Z · masa · símbolo · nombre ── */
    .tp-el {
      position: relative; aspect-ratio: 1 / 1;
      display: grid; grid-template-rows: auto 1fr auto;
      align-items: center; justify-items: center;
      padding: max(0.35cqw, 1px) max(0.4cqw, 1px);
      background: var(--tp-suave, rgba(27, 38, 55, 0.06));
      border: max(1px, 0.14cqw) solid var(--tp-borde, rgba(27, 38, 55, 0.35));
      border-radius: max(0.7cqw, 2px);
      cursor: pointer; overflow: hidden;
      transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .tp-el:hover, .tp-el:focus-visible {
      transform: translateY(-6%) scale(1.07);
      border-color: var(--tp-c, #1b2637);
      box-shadow: 0 0.7cqw 1.7cqw rgba(2, 6, 23, 0.22);
      z-index: 3; outline: none;
    }
    .tp-el:focus-visible { outline: max(2px, 0.2cqw) solid var(--tp-c, #1b2637); outline-offset: 1px; }
    .tp-el:active { transform: translateY(-2%) scale(1.03); }
    .tp-el-arriba {
      width: 100%; display: flex; align-items: baseline;
      justify-content: space-between; gap: max(0.3cqw, 1px);
      font-variant-numeric: tabular-nums;
    }
    .tp-el-z { font-size: max(1.2cqw, 7px); font-weight: 800; color: #64748b; }
    .tp-el-masa {
      font-size: max(0.9cqw, 6px); font-weight: 600; color: #64748b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
    }
    .tp-el-simbolo {
      font-size: max(2.7cqw, 9px); font-weight: 800; line-height: 1;
      letter-spacing: -0.01em; color: var(--tp-t, #1b2637);
    }
    .tp-el-nombre {
      max-width: 100%; font-size: max(1.08cqw, 6px); font-weight: 600;
      line-height: 1.15; color: #334155;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    @container (max-width: 620px) {
      .tp-el-masa { display: none; }
      .tp-el-z { justify-self: start; }
      .tp-el-simbolo { font-size: max(3cqw, 9px); }
    }

    /* ── Huecos «57–71» y «89–103» dentro de la tabla ── */
    .tp-hueco {
      aspect-ratio: 1 / 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: max(0.2cqw, 1px);
      border: max(1px, 0.14cqw) dashed var(--tp-borde, rgba(27, 38, 55, 0.4));
      border-radius: max(0.7cqw, 2px);
      background: var(--tp-suave, rgba(27, 38, 55, 0.05));
      font-size: max(1.25cqw, 7px); font-weight: 800; color: var(--tp-t, #1b2637);
      font-variant-numeric: tabular-nums; user-select: none; text-align: center;
    }
    .tp-hueco-serie {
      max-width: 92%; font-size: max(0.95cqw, 5px); font-weight: 700;
      letter-spacing: 0.04em; color: #64748b;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Leyenda de familias ── */
    .tp-leyenda {
      display: flex; flex-wrap: wrap; align-items: center;
      gap: max(0.6cqw, 4px) max(1.4cqw, 8px);
      margin-top: max(1.4cqw, 8px); padding: 0 max(0.2cqw, 0px);
    }
    .tp-leyenda-item {
      display: inline-flex; align-items: center; gap: max(0.5cqw, 3px);
      font-size: max(1.35cqw, 9px); font-weight: 600; color: #374151;
    }
    .tp-leyenda-punto {
      width: max(1.5cqw, 8px); height: max(1.5cqw, 8px); border-radius: 50%;
      background: var(--tp-c, #1b2637); flex: none;
    }

    /* ── MODAL de la tarjeta (✕ · Esc · clic en el fondo) ── */
    .tp-velo {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      padding: 22px 14px; box-sizing: border-box;
      background: rgba(15, 23, 42, 0.58);
      -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
      animation: tp-aparecer 0.16s ease;
    }
    @keyframes tp-aparecer { from { opacity: 0; } to { opacity: 1; } }
    .tp-modal {
      position: relative; width: 100%; max-width: min(94vw, 620px);
      max-height: 94vh; max-height: 94svh; overflow: auto;
      background: #ffffff; border-radius: 18px;
      padding: 20px 20px 16px;
      box-shadow: 0 30px 80px rgba(2, 6, 23, 0.45);
      animation: tp-subir 0.18s ease;
    }
    @keyframes tp-subir { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }
    .tp-cerrar {
      position: absolute; top: 10px; right: 10px; z-index: 2;
      width: 36px; height: 36px; border-radius: 50%; border: none; cursor: pointer;
      background: #f1f5f9; color: #334155;
      font-size: 19px; line-height: 1; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .tp-cerrar:hover { background: #fee2e2; color: #b91c1c; }
    .tp-cerrar:focus-visible { outline: 2px solid #1b2637; outline-offset: 2px; }
    .tp-modal-cuerpo { display: flex; justify-content: center; }
    .tp-modal-cuerpo .tq-escena { width: 100%; max-width: 560px; }

    .tp-cargando {
      padding: 34px 10px; text-align: center;
      font-size: 15px; font-weight: 600; color: #64748b;
    }

    /* ── Ficha básica SOLO si el visual de la tarjeta no carga ── */
    .tp-fallback {
      width: 100%; max-width: 420px; margin: 0 auto;
      background: #ffffff; border: 3px solid var(--tp-c, #1b2637);
      border-radius: 14px; padding: 18px; text-align: center;
    }
    .tp-fb-simbolo { font-size: 46px; font-weight: 800; line-height: 1; color: var(--tp-t, #1b2637); }
    .tp-fb-nombre { font-size: 17px; font-weight: 700; margin-top: 4px; color: #1b2637; }
    .tp-fb-alt { font-size: 13px; font-style: italic; color: #64748b; }
    .tp-fb-familia {
      display: inline-block; margin-top: 10px; padding: 4px 12px;
      border: 1.5px solid var(--tp-c, #1b2637); border-radius: 99px;
      font-size: 12.5px; font-weight: 700; color: var(--tp-t, #1b2637);
    }
    .tp-fb-datos { margin-top: 12px; font-size: 14px; font-weight: 600; color: #334155; font-variant-numeric: tabular-nums; }
    .tp-fb-nota { margin-top: 12px; font-size: 11.5px; line-height: 1.5; color: #94a3b8; }
  `;
  document.head.append(estilo);
}

/* ════════════════════════════════════════════════════════════════════
   TABLA DE LOS 118 ELEMENTOS (datos internos, sin servicios externos)
   ──────────────────────────────────────────────────────────────────
   Una línea por elemento, con barras «|»:
     Z | símbolo | nombre ES | nombre EN | peso atómico completo
   · peso: peso atómico estándar (IUPAC/CIAAW); los elementos SIN
     isótopo estable van entre paréntesis — así se muestran.
   · la FAMILIA de cada elemento NO se escribe: se deduce sola de
     su Z con categoriaDe() (la MISMA clasificación que usa la
     tarjeta química), y la POSICIÓN en la rejilla también se
     calcula sola con celdaDe().
   ════════════════════════════════════════════════════════════════════ */

const DATOS = `
1|H|Hidrógeno|Hydrogen|1.008
2|He|Helio|Helium|4.0026
3|Li|Litio|Lithium|6.94
4|Be|Berilio|Beryllium|9.0122
5|B|Boro|Boron|10.81
6|C|Carbono|Carbon|12.011
7|N|Nitrógeno|Nitrogen|14.007
8|O|Oxígeno|Oxygen|15.999
9|F|Flúor|Fluorine|18.998
10|Ne|Neón|Neon|20.180
11|Na|Sodio|Sodium|22.990
12|Mg|Magnesio|Magnesium|24.305
13|Al|Aluminio|Aluminum|26.982
14|Si|Silicio|Silicon|28.085
15|P|Fósforo|Phosphorus|30.974
16|S|Azufre|Sulfur|32.06
17|Cl|Cloro|Chlorine|35.45
18|Ar|Argón|Argon|39.948
19|K|Potasio|Potassium|39.098
20|Ca|Calcio|Calcium|40.078
21|Sc|Escandio|Scandium|44.956
22|Ti|Titanio|Titanium|47.867
23|V|Vanadio|Vanadium|50.942
24|Cr|Cromo|Chromium|51.996
25|Mn|Manganeso|Manganese|54.938
26|Fe|Hierro|Iron|55.845
27|Co|Cobalto|Cobalt|58.933
28|Ni|Níquel|Nickel|58.693
29|Cu|Cobre|Copper|63.546
30|Zn|Zinc|Zinc|65.38
31|Ga|Galio|Gallium|69.723
32|Ge|Germanio|Germanium|72.630
33|As|Arsénico|Arsenic|74.922
34|Se|Selenio|Selenium|78.971
35|Br|Bromo|Bromine|79.904
36|Kr|Kriptón|Krypton|83.798
37|Rb|Rubidio|Rubidium|85.468
38|Sr|Estroncio|Strontium|87.62
39|Y|Itrio|Yttrium|88.906
40|Zr|Circonio|Zirconium|91.224
41|Nb|Niobio|Niobium|92.906
42|Mo|Molibdeno|Molybdenum|95.95
43|Tc|Tecnecio|Technetium|(98)
44|Ru|Rutenio|Ruthenium|101.07
45|Rh|Rodio|Rhodium|102.91
46|Pd|Paladio|Palladium|106.42
47|Ag|Plata|Silver|107.87
48|Cd|Cadmio|Cadmium|112.41
49|In|Indio|Indium|114.82
50|Sn|Estaño|Tin|118.71
51|Sb|Antimonio|Antimony|121.76
52|Te|Telurio|Tellurium|127.60
53|I|Yodo|Iodine|126.90
54|Xe|Xenón|Xenon|131.29
55|Cs|Cesio|Cesium|132.91
56|Ba|Bario|Barium|137.33
57|La|Lantano|Lanthanum|138.91
58|Ce|Cerio|Cerium|140.12
59|Pr|Praseodimio|Praseodymium|140.91
60|Nd|Neodimio|Neodymium|144.24
61|Pm|Prometio|Promethium|(145)
62|Sm|Samario|Samarium|150.36
63|Eu|Europio|Europium|151.96
64|Gd|Gadolinio|Gadolinium|157.25
65|Tb|Terbio|Terbium|158.93
66|Dy|Disprosio|Dysprosium|162.50
67|Ho|Holmio|Holmium|164.93
68|Er|Erbio|Erbium|167.26
69|Tm|Tulio|Thulium|168.93
70|Yb|Iterbio|Ytterbium|173.05
71|Lu|Lutecio|Lutetium|174.97
72|Hf|Hafnio|Hafnium|178.49
73|Ta|Tantalio|Tantalum|180.95
74|W|Wolframio|Tungsten|183.84
75|Re|Renio|Rhenium|186.21
76|Os|Osmio|Osmium|190.23
77|Ir|Iridio|Iridium|192.22
78|Pt|Platino|Platinum|195.08
79|Au|Oro|Gold|196.97
80|Hg|Mercurio|Mercury|200.59
81|Tl|Talio|Thallium|204.38
82|Pb|Plomo|Lead|207.2
83|Bi|Bismuto|Bismuth|208.98
84|Po|Polonio|Polonium|(209)
85|At|Astato|Astatine|(210)
86|Rn|Radón|Radon|(222)
87|Fr|Francio|Francium|(223)
88|Ra|Radio|Radium|(226)
89|Ac|Actinio|Actinium|(227)
90|Th|Torio|Thorium|232.04
91|Pa|Protactinio|Protactinium|231.04
92|U|Uranio|Uranium|238.03
93|Np|Neptunio|Neptunium|(237)
94|Pu|Plutonio|Plutonium|(244)
95|Am|Americio|Americium|(243)
96|Cm|Curio|Curium|(247)
97|Bk|Berkelio|Berkelium|(247)
98|Cf|Californio|Californium|(251)
99|Es|Einstenio|Einsteinium|(252)
100|Fm|Fermio|Fermium|(257)
101|Md|Mendelevio|Mendelevium|(258)
102|No|Nobelio|Nobelium|(259)
103|Lr|Lawrencio|Lawrencium|(266)
104|Rf|Rutherfordio|Rutherfordium|(267)
105|Db|Dubnio|Dubnium|(268)
106|Sg|Seaborgio|Seaborgium|(269)
107|Bh|Bohrio|Bohrium|(270)
108|Hs|Hasio|Hassium|(269)
109|Mt|Meitnerio|Meitnerium|(278)
110|Ds|Darmstatio|Darmstadtium|(281)
111|Rg|Roentgenio|Roentgenium|(282)
112|Cn|Copernicio|Copernicium|(285)
113|Nh|Nihonio|Nihonium|(286)
114|Fl|Flerovio|Flerovium|(289)
115|Mc|Moscovio|Moscovium|(290)
116|Lv|Livermorio|Livermorium|(293)
117|Ts|Teneso|Tennessine|(294)
118|Og|Oganesón|Oganesson|(294)
`.trim();

/* Lista procesada: { z, simbolo, nombre, nombreEn, masa } */
const LISTA = DATOS.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
  const p = l.split("|");
  return { z: Number(p[0]), simbolo: p[1], nombre: p[2], nombreEn: p[3], masa: p[4] };
});

/* ── Categoría / familia (MISMA clasificación de la tarjeta química) ── */
function categoriaDe(z) {
  if ([3, 11, 19, 37, 55, 87].includes(z)) return "alcalino";
  if ([4, 12, 20, 38, 56, 88].includes(z)) return "alcalinoterreo";
  if (z >= 57 && z <= 71) return "lantanido";
  if (z >= 89 && z <= 103) return "actinido";
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) ||
    (z >= 72 && z <= 80) || (z >= 104 && z <= 112)) return "transicion";
  if ([5, 14, 32, 33, 51, 52].includes(z)) return "metaloide";
  if ([9, 17, 35, 53, 85, 117].includes(z)) return "halogeno";
  if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return "noble";
  if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].includes(z)) return "otroMetal";
  return "noMetal"; // 1, 6, 7, 8, 15, 16, 34
}

/* Gamas por categoría: color fuerte (c), texto/acento oscuro (t)
   y fondo suave (suave) — idénticas a las de la tarjeta. */
const GAMAS = {
  alcalino:       { c: "#e53935", t: "#c62828", suave: "rgba(229, 57, 53, 0.09)" },
  alcalinoterreo: { c: "#fb8c00", t: "#e65100", suave: "rgba(251, 140, 0, 0.10)" },
  transicion:     { c: "#f9a825", t: "#546e7a", suave: "rgba(249, 168, 37, 0.12)" },
  lantanido:      { c: "#8d6e63", t: "#6d4c41", suave: "rgba(141, 110, 99, 0.12)" },
  actinido:       { c: "#7b1fa2", t: "#6a1b9a", suave: "rgba(123, 31, 162, 0.10)" },
  otroMetal:      { c: "#00897b", t: "#00695c", suave: "rgba(0, 137, 123, 0.10)" },
  metaloide:      { c: "#7cb342", t: "#558b2f", suave: "rgba(124, 179, 66, 0.12)" },
  noMetal:        { c: "#039be5", t: "#0277bd", suave: "rgba(3, 155, 229, 0.10)" },
  halogeno:       { c: "#9c27b0", t: "#7b1fa2", suave: "rgba(156, 39, 176, 0.10)" },
  noble:          { c: "#d81b60", t: "#ad1457", suave: "rgba(216, 27, 96, 0.10)" },
};

/* Nombres de las 10 familias para la LEYENDA (en plural) y para la
   ficha básica de emergencia: [español, english] por categoría. */
const LEYENDA = {
  alcalino:       ["Metales alcalinos", "Alkali metals"],
  alcalinoterreo: ["Alcalinotérreos", "Alkaline earth metals"],
  transicion:     ["Metales de transición", "Transition metals"],
  lantanido:      ["Lantánidos", "Lanthanides"],
  actinido:       ["Actínidos", "Actinides"],
  otroMetal:      ["Otros metales", "Post-transition metals"],
  metaloide:      ["Metaloides", "Metalloids"],
  noMetal:        ["No metales", "Nonmetals"],
  halogeno:       ["Halógenos", "Halogens"],
  noble:          ["Gases nobles", "Noble gases"],
};
const ORDEN_LEYENDA = ["alcalino", "alcalinoterreo", "transicion", "lantanido", "actinido",
  "otroMetal", "metaloide", "noMetal", "halogeno", "noble"];

/* ── Rótulos de la tabla y del modal en los dos idiomas ── */
const ETIQUETAS = {
  es: {
    tabla: "Tabla periódica de los elementos",
    abrir: (n, s, z) => n + " (" + s + "), número atómico " + z + " — abrir la tarjeta con todos sus datos",
    cerrar: "Cerrar",
    cargando: "Cargando la tarjeta…",
    huecoLa: "Lantánidos",
    huecoAc: "Actínidos",
    fallbackNota: "No se pudo cargar la tarjeta completa (falta recursos/js/visuales/ciencias/tarjetaElementoQuimico.js). Estos son los datos básicos:",
  },
  en: {
    tabla: "Periodic table of the elements",
    abrir: (n, s, z) => n + " (" + s + "), atomic number " + z + " — open the card with all its data",
    cerrar: "Close",
    cargando: "Loading the card…",
    huecoLa: "Lanthanides",
    huecoAc: "Actinides",
    fallbackNota: "The full card could not be loaded (recursos/js/visuales/ciencias/tarjetaElementoQuimico.js is missing). These are the basic data:",
  },
};

/* ── Ayudantes de texto ── */
function normaliza(s) {
  return String(s ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* «22.990» → «22,990» en español; «(98)» queda igual */
function masaTexto(masa, idioma) {
  const t = String(masa);
  return idioma === "es" ? t.replace(".", ",") : t;
}

/* #rrggbb → rgba(r, g, b, alfa) (para los bordes de las celdas) */
function hexARgba(hex, alfa) {
  const m = String(hex).replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return "rgba(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ", " + alfa + ")";
}

/* ── POSICIÓN en la rejilla: celdaDe(z) → [fila, columna] ──
   filas 1–7 = periodos (la fila 1 de la rejilla son los grupos);
   filas 9–10 = lantánidos y actínidos (la fila 8 de la rejilla es
   un separador). En TODOS los casos: rejilla = fila + 1. */
function celdaDe(z) {
  if (z === 1) return [1, 1];
  if (z === 2) return [1, 18];
  if (z <= 4) return [2, z - 2];          // Li, Be
  if (z <= 10) return [2, z + 8];         // B…Ne → grupos 13…18
  if (z <= 12) return [3, z - 10];        // Na, Mg
  if (z <= 18) return [3, z];             // Al…Ar → grupos 13…18
  if (z <= 36) return [4, z - 18];        // K…Kr
  if (z <= 54) return [5, z - 36];        // Rb…Xe
  if (z <= 56) return [6, z - 54];        // Cs, Ba
  if (z <= 71) return [9, z - 54];        // La…Lu → serie de abajo, cols 3…17
  if (z <= 86) return [6, z - 68];        // Hf…Rn → grupos 4…18
  if (z <= 88) return [7, z - 86];        // Fr, Ra
  if (z <= 103) return [10, z - 86];      // Ac…Lr → serie de abajo, cols 3…17
  return [7, z - 100];                    // Rf…Og → grupos 4…18
}

/* ════════════════════════════════════════════════════════════════════
   CONSTRUCCIÓN DE LA TABLA
   ════════════════════════════════════════════════════════════════════ */

/* Una celda de elemento: Z (arriba-izq) · peso completo (arriba-der)
   · símbolo (centro) · nombre (abajo). Colores de SU familia. */
function crearCelda(el, idioma, et) {
  const cat = categoriaDe(el.z);
  const gama = GAMAS[cat];
  const nombre = idioma === "es" ? el.nombre : el.nombreEn;

  const celda = document.createElement("div");
  celda.className = "tp-el";
  celda.dataset.z = String(el.z);
  celda.dataset.simbolo = el.simbolo;
  celda.setAttribute("role", "button");
  celda.setAttribute("tabindex", "0");
  celda.setAttribute("aria-haspopup", "dialog");
  celda.setAttribute("aria-label", et.abrir(nombre, el.simbolo, el.z));
  celda.title = nombre + " (" + el.simbolo + ")";

  /* Gama de la familia, para fondo, borde y símbolo */
  celda.style.setProperty("--tp-c", gama.c);
  celda.style.setProperty("--tp-t", gama.t);
  celda.style.setProperty("--tp-suave", gama.suave);
  celda.style.setProperty("--tp-borde", hexARgba(gama.c, 0.45));

  celda.innerHTML =
    '<span class="tp-el-arriba">' +
      '<span class="tp-el-z">' + el.z + "</span>" +
      '<span class="tp-el-masa">' + esc(masaTexto(el.masa, idioma)) + "</span>" +
    "</span>" +
    '<span class="tp-el-simbolo">' + esc(el.simbolo) + "</span>" +
    '<span class="tp-el-nombre">' + esc(nombre) + "</span>";

  return celda;
}

/* Hueco «57–71» / «89–103» (marca del lugar que ocupan las series f) */
function crearHueco(texto, serie, cat) {
  const gama = GAMAS[cat];
  const hueco = document.createElement("div");
  hueco.className = "tp-hueco";
  hueco.style.setProperty("--tp-borde", hexARgba(gama.c, 0.55));
  hueco.style.setProperty("--tp-suave", gama.suave);
  hueco.style.setProperty("--tp-t", gama.t);
  hueco.innerHTML = "<span>" + texto + "</span>" +
    '<span class="tp-hueco-serie">' + esc(serie) + "</span>";
  return hueco;
}

/* Rótulo pequeño (número de grupo o de periodo) */
function crearRotulo(texto, clase) {
  const r = document.createElement("span");
  r.className = clase;
  r.textContent = texto;
  return r;
}

/* Leyenda con las 10 familias, en el idioma pedido */
function crearLeyenda(idioma) {
  const leyenda = document.createElement("div");
  leyenda.className = "tp-leyenda";
  const idx = idioma === "es" ? 0 : 1;
  for (const cat of ORDEN_LEYENDA) {
    const item = document.createElement("span");
    item.className = "tp-leyenda-item";
    item.style.setProperty("--tp-c", GAMAS[cat].c);
    const punto = document.createElement("span");
    punto.className = "tp-leyenda-punto";
    item.appendChild(punto);
    item.appendChild(document.createTextNode(LEYENDA[cat][idx]));
    leyenda.appendChild(item);
  }
  return leyenda;
}

/* La rejilla completa: rótulos, 118 celdas, huecos y separador */
function construirTabla(idioma) {
  const et = ETIQUETAS[idioma];
  const tabla = document.createElement("div");
  tabla.className = "tp-tabla";
  tabla.setAttribute("role", "grid");
  tabla.setAttribute("aria-label", et.tabla);

  /* Rótulos de los 18 grupos (fila 1, columnas 2…19) */
  for (let g = 1; g <= 18; g++) {
    const r = crearRotulo(String(g), "tp-grupo");
    r.style.gridRow = "1";
    r.style.gridColumn = String(g + 1);
    tabla.appendChild(r);
  }

  /* Rótulos de los 7 periodos (columna 1, filas 2…8) */
  for (let p = 1; p <= 7; p++) {
    const r = crearRotulo(String(p), "tp-periodo");
    r.style.gridRow = String(p + 1);
    r.style.gridColumn = "1";
    tabla.appendChild(r);
  }
  /* Rótulos de las series f (columna 1, filas 10 y 11: son los
     periodos 6 y 7 desdoblados) */
  for (const [fila, p] of [[10, "6"], [11, "7"]]) {
    const r = crearRotulo(p, "tp-periodo");
    r.style.gridRow = String(fila);
    r.style.gridColumn = "1";
    tabla.appendChild(r);
  }

  /* Separador entre la tabla principal y las series f */
  const sep = document.createElement("div");
  sep.className = "tp-separador";
  sep.style.gridRow = "9";
  sep.style.gridColumn = "1 / -1";
  tabla.appendChild(sep);

  /* Huecos «57–71» y «89–103» dentro de la tabla principal */
  const huecoLa = crearHueco("57–71", et.huecoLa, "lantanido");
  huecoLa.style.gridRow = "7";
  huecoLa.style.gridColumn = "4";
  tabla.appendChild(huecoLa);
  const huecoAc = crearHueco("89–103", et.huecoAc, "actinido");
  huecoAc.style.gridRow = "8";
  huecoAc.style.gridColumn = "4";
  tabla.appendChild(huecoAc);

  /* Las 118 celdas de elementos */
  for (const el of LISTA) {
    const [fila, col] = celdaDe(el.z);
    const celda = crearCelda(el, idioma, et);
    celda.style.gridRow = String(fila + 1);
    celda.style.gridColumn = String(col + 1);
    tabla.appendChild(celda);
  }

  return tabla;
}

/* ════════════════════════════════════════════════════════════════════
   MODAL con la TARJETA QUÍMICA (reutiliza el visual de la tarjeta,
   cargado por import() UNA sola vez; con ficha básica de emergencia).
   ════════════════════════════════════════════════════════════════════ */

const URL_TARJETA = new URL(
  "../../../recursos/js/visuales/ciencias/tarjetaElementoQuimico.js",
  import.meta.url
).href;

let _modTarjeta = null;   // promesa del módulo (se importa UNA vez)

function moduloTarjeta() {
  if (!_modTarjeta) _modTarjeta = import(URL_TARJETA);
  return _modTarjeta;
}

/* Ficha básica SOLO si el visual de la tarjeta no está disponible */
function crearFallback(el, idioma) {
  const cat = categoriaDe(el.z);
  const gama = GAMAS[cat];
  const et = ETIQUETAS[idioma];
  const nombre = idioma === "es" ? el.nombre : el.nombreEn;
  const alternativo = idioma === "es" ? el.nombreEn : el.nombre;
  const familia = LEYENDA[cat][idioma === "es" ? 0 : 1];

  const ficha = document.createElement("div");
  ficha.className = "tp-fallback";
  ficha.style.setProperty("--tp-c", gama.c);
  ficha.style.setProperty("--tp-t", gama.t);
  ficha.dataset.z = String(el.z);
  ficha.dataset.simbolo = el.simbolo;
  ficha.innerHTML =
    '<div class="tp-fb-simbolo">' + esc(el.simbolo) + "</div>" +
    '<div class="tp-fb-nombre">' + esc(nombre) + " · " + el.z + "</div>" +
    '<div class="tp-fb-alt">' + esc(alternativo) + "</div>" +
    '<div class="tp-fb-familia">' + esc(familia) + "</div>" +
    '<div class="tp-fb-datos">' + esc(masaTexto(el.masa, idioma)) + " u</div>" +
    '<div class="tp-fb-nota">' + esc(et.fallbackNota) + "</div>";
  return ficha;
}

let _veloAbierto = null;   // el modal que esté visible (o null)

function cerrarModal() {
  if (!_veloAbierto) return;
  const { velo, celda } = _veloAbierto;
  _veloAbierto = null;
  document.removeEventListener("keydown", enModalTecla);
  velo.remove();
  document.documentElement.style.overflow = "";
  if (celda && celda.isConnected) celda.focus({ preventScroll: true });
}

function enModalTecla(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    cerrarModal();
  }
}

/* Abre el modal de UN elemento (por su z) y monta la tarjeta dentro */
async function abrirModal(el, idioma, celda) {
  if (_veloAbierto) return;   // ya hay una tarjeta abierta
  const et = ETIQUETAS[idioma];

  const velo = document.createElement("div");
  velo.className = "tp-velo";

  const modal = document.createElement("div");
  modal.className = "tp-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", (idioma === "es" ? el.nombre : el.nombreEn));

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "tp-cerrar";
  cerrar.textContent = "✕";
  cerrar.setAttribute("aria-label", et.cerrar);
  cerrar.addEventListener("click", cerrarModal);

  const cuerpo = document.createElement("div");
  cuerpo.className = "tp-modal-cuerpo";
  cuerpo.innerHTML = '<div class="tp-cargando">' + esc(et.cargando) + "</div>";

  modal.append(cerrar, cuerpo);
  velo.appendChild(modal);
  document.body.appendChild(velo);
  _veloAbierto = { velo, celda };
  document.documentElement.style.overflow = "hidden";   // sin scroll de fondo
  document.addEventListener("keydown", enModalTecla);
  velo.addEventListener("mousedown", (e) => { if (e.target === velo) cerrarModal(); });
  cerrar.focus({ preventScroll: true });

  /* La tarjeta química del visual (UNA importación para toda la sesión) */
  try {
    const mod = await moduloTarjeta();
    if (_veloAbierto && _veloAbierto.velo !== velo) return;   // ya se cerró
    cuerpo.innerHTML = "";
    mod.mostrarTarjetaElemento({
      numeroAtomico: el.z,
      idioma: idioma === "es" ? "español" : "english",
      tamano: 560,
      contenedor: cuerpo,
    });
  } catch (e) {
    if (_veloAbierto && _veloAbierto.velo !== velo) return;
    console.warn("[tablaPeriodica] tarjeta no disponible:", e);
    cuerpo.innerHTML = "";
    cuerpo.appendChild(crearFallback(el, idioma));
  }
}

/* ════════════════════════════════════════════════════════════════════
   TABLA PERIÓDICA — construye la tabla, la muestra centrada en el
   <body> (o en el contenedor pedido) y la devuelve.
   ════════════════════════════════════════════════════════════════════ */

export function tablaPeriodica(opciones = {}) {
  inyectarEstilos();
  const opc = opciones || {};

  /* Idioma: «english»/«en»/«inglés»/«ingles» → en; todo lo demás → es */
  const idioma = /^(en\b|english|ingl)/.test(normaliza(opc.idioma)) ? "en" : "es";

  /* Ancho máximo de la tabla (el contenedor más angosto manda) */
  const ancho = Math.min(2000, Math.max(260, Number(opc.ancho) || 1280));

  const escena = document.createElement("div");
  escena.className = "tp-escena";
  escena.dataset.idioma = idioma;
  escena.style.setProperty("--tp-ancho", ancho + "px");

  const tabla = construirTabla(idioma);
  escena.appendChild(tabla);
  escena.appendChild(crearLeyenda(idioma));

  /* Al pulsar (clic, Enter o espacio) se abre la tarjeta del elemento */
  tabla.addEventListener("click", (e) => {
    const celda = e.target.closest(".tp-el");
    if (!celda || !tabla.contains(celda)) return;
    const el = LISTA[Number(celda.dataset.z) - 1];
    if (el) abrirModal(el, idioma, celda);
  });
  tabla.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const celda = e.target.closest(".tp-el");
    if (!celda || !tabla.contains(celda)) return;
    e.preventDefault();
    const el = LISTA[Number(celda.dataset.z) - 1];
    if (el) abrirModal(el, idioma, celda);
  });

  /* Sin contenedor: la tabla se muestra DIRECTAMENTE centrada en
     el cuerpo de la página. Con contenedor (elemento o selector):
     se agrega allí (la usan el editor «Crear» y las páginas). */
  let destino = null;
  if (typeof opc.contenedor === "string") {
    destino = document.querySelector(opc.contenedor);
  } else if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    destino = opc.contenedor;
  }
  if (destino) {
    destino.appendChild(escena);
  } else {
    const caja = document.createElement("div");
    caja.className = "tp-caja";
    caja.appendChild(escena);
    document.body.appendChild(caja);
  }

  return escena;
}