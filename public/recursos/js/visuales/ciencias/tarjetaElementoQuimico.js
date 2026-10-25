// ============================================================
// ciencias/tarjetaElementoQuimico.js — Recurso visual: TARJETA
// QUÍMICA DEL ELEMENTO   ·   v1.1 (masa aproximada con DOS decimales)
// (recursos/js/visuales/ciencias/tarjetaElementoQuimico.js)
//
// Presenta en pantalla una TARJETA CUADRADA (cuadrado perfecto,
// estructura rígida, limpia y moderna) con TODA la información
// de UN elemento químico. La herramienta busca los datos AQUÍ
// MISMO (tabla completa de los 118 elementos, sin librerías ni
// servicios externos) y solo necesita UN dato bien escrito;
// los demás quedan opcionales:
//
//   · numeroAtomico   1–118 (el H es 1, el Og es 118)
//   · simbolo         SENSIBLE A MAYÚSCULAS: «Na» sirve,
//                     «na» NO (mensaje que lo explica)
//   · nombre          en ESPAÑOL o INGLÉS, sin importar
//                     mayúsculas ni acentos: «sodio», «SODIO»,
//                     «Oxígeno», «sodium», «oxygen»…
//
// La tarjeta despliega: número atómico, símbolo, nombre (y su
// nombre en el otro idioma), masa atómica exacta y masa atómica
// APROXIMADA con DOS decimales (ej: 22,99 u), protones (=
// número atómico), electrones (= número atómico) y neutrones (=
// número másico − número atómico), periodo,
// grupo, bloque (s / p / d / f), naturaleza o familia, estados
// de oxidación y configuración electrónica completa y reducida.
//
// La GAMA DE COLOR de bordes y acentos se adapta sola a la
// categoría del elemento:
//   alcalinos        → rojo intenso          (#e53935)
//   alcalinotérreos  → naranja claro         (#fb8c00)
//   de transición    → amarillo + grises     (#f9a825)
//   lantánidos       → marrón                (#8d6e63)
//   actínidos        → violeta               (#7b1fa2)
//   otros metales    → verde azulado         (#00897b)
//   metaloides       → verde claro / oliva   (#7cb342)
//   no metales       → azul claro            (#039be5)
//   halógenos        → morado                (#9c27b0)
//   gases nobles     → rosa / magenta        (#d81b60)
//
// HTML + CSS puros, SIN librerías y SIN eventos: la tarjeta es
// puramente para mirar. Las letras escalan con el tamaño del
// cuadrado (container queries, unidades cqw), así que conserva
// su forma perfecta en celular, en la vista previa del editor
// «Crear» o a pantalla completa. Si un dato no cuadra (número
// fuera de 1–118, símbolo con mayúsculas equivocadas, nombre
// desconocido) la MISMA tarjeta cuadrada muestra un aviso claro
// con la pista de cómo escribirlo bien.
//
// ─── PARÁMETROS (objeto de opciones; con UNO bien escrito basta) ───
//   numeroAtomico   Número atómico entero 1–118. (Opcional)
//   simbolo         Símbolo químico EXACTO: «Na», «Cl», «Fe»…
//                   (Opcional; SÍ distingue mayúsculas)
//   nombre          Nombre en español o inglés. (Opcional; NO
//                   distingue mayúsculas ni acentos)
//   idioma          «español» (defecto) o «english»: el idioma
//                   de TODOS los rótulos de la tarjeta.
//   tamano          Lado del cuadrado en px. (Defecto: 560; en
//                   pantallas angostas encoge solo)
//   contenedor      HTMLElement opcional: la tarjeta se agrega
//                   ahí. SIN contenedor se construye y se muestra
//                   DIRECTAMENTE centrada en el cuerpo de la
//                   página (<body>).
//
// ─── PRIORIDAD si llegan varios datos a la vez ───
//   numeroAtomico › simbolo › nombre. Si el primero que llegue
//   está mal escrito, la tarjeta avisa en vez de adivinar.
//
// ─── DEVUELVE ───
//   El elemento .tq-tarjeta (con data-z, data-simbolo y
//   data-idioma), ya insertado en el contenedor pedido o
//   centrado en el <body>.
//
// USO DESDE UNA CLASE (contenido):
//   import { mostrarTarjetaElemento } from
//     "../../../recursos/js/visuales/ciencias/tarjetaElementoQuimico.js";
//
//   mostrarTarjetaElemento({ numeroAtomico: 11 });                 // Sodio
//   mostrarTarjetaElemento({ simbolo: "Cl", idioma: "english" });  // Chlorine
//   mostrarTarjetaElemento({ nombre: "oxígeno", contenedor: zona });// Oxígeno
// ============================================================

/* ---------------- CSS implícito (inyectado UNA sola vez) ---------------- */

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "visuales-tarjeta-elemento-estilos";
  estilo.textContent = `
    /* Envoltura para mostrar la tarjeta CENTRADA en el <body> */
    .tq-caja {
      display: flex; align-items: center; justify-content: center;
      width: 100%; min-height: 100vh; min-height: 100svh;
      padding: 26px 14px; box-sizing: border-box;
    }
    /* Escena = contenedor de tamaño cuadrado; las letras dentro de la
       tarjeta usan cqw (1 cqw = 1% del lado del cuadrado), así TODO
       escala junto y el cuadrado se mantiene perfecto en cualquier
       pantalla, vista previa del editor o tamaño pedido. */
    .tq-escena {
      container-type: inline-size;
      width: var(--tq-lado, 560px);
      max-width: 100%;
      max-width: min(100%, 94vh);
      max-width: min(100%, 94svh);
      margin: 0;
    }
    .tq-tarjeta {
      box-sizing: border-box; width: 100%; aspect-ratio: 1 / 1; margin: 0;
      background: #ffffff;
      border: max(2px, 0.55cqw) solid var(--tq-c, #1b2637);
      border-radius: 3cqw;
      overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 18px 46px rgba(15, 23, 42, 0.16);
      font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1b2637; text-align: left;
    }
    .tq-tarjeta * { box-sizing: border-box; margin: 0; padding: 0; font-family: inherit; }

    /* ── Cabecera: Z · símbolo · nombre · familia ── */
    .tq-cabecera {
      display: grid; grid-template-columns: auto 1fr auto;
      align-items: center; gap: 3.4cqw;
      padding: 3cqw 4.6cqw;
      background: var(--tq-suave, rgba(27, 38, 55, 0.07));
      border-bottom: max(1.5px, 0.3cqw) solid var(--tq-c, #1b2637);
    }
    .tq-z { display: flex; flex-direction: column; align-items: center; gap: 0.8cqw; min-width: 11cqw; }
    .tq-z-num { font-size: 7.4cqw; font-weight: 800; line-height: 1; color: var(--tq-t, #1b2637); }
    .tq-z-et {
      font-size: 1.9cqw; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: #5b6a80; text-align: center;
    }
    .tq-centro { display: flex; flex-direction: column; align-items: center; gap: 0.6cqw; min-width: 0; }
    .tq-simbolo {
      font-size: 14.2cqw; font-weight: 800; line-height: 0.95;
      letter-spacing: -0.02em; color: var(--tq-t, #1b2637);
    }
    .tq-nombre { font-size: 4cqw; font-weight: 700; line-height: 1.1; text-align: center; }
    .tq-nombre-alt { font-size: 2.4cqw; font-style: italic; color: #64748b; text-align: center; }
    .tq-familia {
      font-size: 2.3cqw; font-weight: 700; white-space: nowrap;
      color: var(--tq-t, #1b2637);
      border: max(1px, 0.22cqw) solid var(--tq-c, #1b2637);
      background: #ffffff; border-radius: 99cqw; padding: 1.1cqw 2.4cqw;
      align-self: center;
    }

    /* ── Cuerpo: rejilla rígida 2 × 4 + filas completas ── */
    .tq-cuerpo {
      flex: 1; min-height: 0;
      display: grid; grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(4, minmax(auto, 1fr)) auto auto auto;
      align-content: stretch;
    }
    .tq-celda {
      display: flex; flex-direction: column; justify-content: center; gap: 0.6cqw;
      padding: 1.5cqw 4.4cqw; min-width: 0;
      border-top: 1px solid var(--tq-linea, rgba(27, 38, 55, 0.25));
    }
    .tq-celda:nth-child(odd) { border-right: 1px solid var(--tq-linea, rgba(27, 38, 55, 0.25)); }
    .tq-et {
      font-size: 1.95cqw; font-weight: 700; letter-spacing: 0.11em;
      text-transform: uppercase; color: #5b6a80;
    }
    .tq-val {
      font-size: 3.7cqw; font-weight: 800; color: var(--tq-t, #1b2637);
      font-variant-numeric: tabular-nums;
    }
    .tq-fila {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; justify-content: center; gap: 0.7cqw;
      padding: 1.5cqw 4.4cqw; min-height: 0;
      border-top: 1px solid var(--tq-linea, rgba(27, 38, 55, 0.25));
    }
    .tq-fila .tq-val { font-size: 3cqw; font-weight: 700; color: #1b2637; }
    .tq-oxis { display: flex; flex-wrap: wrap; gap: 0.9cqw; }
    .tq-oxi {
      font-size: 2.5cqw; font-weight: 800; color: var(--tq-t, #1b2637);
      background: var(--tq-suave, rgba(27, 38, 55, 0.07));
      border: 1px solid var(--tq-linea, rgba(27, 38, 55, 0.25));
      border-radius: 0.9cqw; padding: 0.4cqw 1.5cqw;
      font-variant-numeric: tabular-nums;
    }
    .tq-config { font-size: 2.85cqw; line-height: 1.4; color: #1b2637; word-spacing: 0.3cqw; }
    .tq-config sup { font-size: 60%; line-height: 0; }

    /* ── Variante de ERROR (mismo cuadrado, gamas rojas) ── */
    .tq-tarjeta.tq-error {
      --tq-c: #dc2626; --tq-t: #b91c1c;
      --tq-suave: rgba(220, 38, 38, 0.08); --tq-linea: rgba(220, 38, 38, 0.28);
    }
    .tq-error-cuerpo {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 2.4cqw;
      padding: 6cqw; text-align: center;
    }
    .tq-error-icono {
      width: 13cqw; height: 13cqw; border-radius: 50%;
      background: rgba(220, 38, 38, 0.1);
      border: max(2px, 0.4cqw) solid #dc2626;
      display: flex; align-items: center; justify-content: center;
      font-size: 7.5cqw; font-weight: 800; color: #b91c1c;
    }
    .tq-error-titulo { font-size: 4.8cqw; font-weight: 800; color: #b91c1c; }
    .tq-error-msj { font-size: 3cqw; line-height: 1.5; color: #374151; max-width: 80cqw; }
    .tq-error-msj b { color: #b91c1c; }
  `;
  document.head.append(estilo);
}

/* ════════════════════════════════════════════════════════════════════
   TABLA DE LOS 118 ELEMENTOS (datos internos, sin servicios externos)
   ──────────────────────────────────────────────────────────────────
   Una línea por elemento, con barras «|»:
     Z | símbolo | nombre ES | nombre EN | masa | oxidaciones | config.
   · masa: peso atómico estándar (IUPAC/CIAAW); los elementos SIN
     isótopo estable llevan entre paréntesis la masa del isótopo más
     estable — así se muestran y con ese número se cuentan neutrones.
   · oxidaciones: los estados más usados en química general.
   · config: configuración electrónica REDUCIDA (con el núcleo del
     gas noble entre corchetes). La COMPLETA se construye sola
     expandiendo el núcleo (ver NUCLEOS abajo). Las excepciones
     conocidas de llenado (Cr, Cu, Nb, Mo, Ru, Rh, Pd, Ag, Pt, Au,
     Ce, Gd, Lr, Pu…) están escritas tal cual son.
   ════════════════════════════════════════════════════════════════════ */

const DATOS = `
1|H|Hidrógeno|Hydrogen|1.008|-1, +1|1s1
2|He|Helio|Helium|4.0026|0|1s2
3|Li|Litio|Lithium|6.94|+1|[He] 2s1
4|Be|Berilio|Beryllium|9.0122|+2|[He] 2s2
5|B|Boro|Boron|10.81|-3, +3|[He] 2s2 2p1
6|C|Carbono|Carbon|12.011|-4, -3, -2, -1, +1, +2, +3, +4|[He] 2s2 2p2
7|N|Nitrógeno|Nitrogen|14.007|-3, -2, -1, +1, +2, +3, +4, +5|[He] 2s2 2p3
8|O|Oxígeno|Oxygen|15.999|-2, -1|[He] 2s2 2p4
9|F|Flúor|Fluorine|18.998|-1|[He] 2s2 2p5
10|Ne|Neón|Neon|20.180|0|[He] 2s2 2p6
11|Na|Sodio|Sodium|22.990|+1|[Ne] 3s1
12|Mg|Magnesio|Magnesium|24.305|+2|[Ne] 3s2
13|Al|Aluminio|Aluminum|26.982|+3|[Ne] 3s2 3p1
14|Si|Silicio|Silicon|28.085|-4, +2, +4|[Ne] 3s2 3p2
15|P|Fósforo|Phosphorus|30.974|-3, +3, +5|[Ne] 3s2 3p3
16|S|Azufre|Sulfur|32.06|-2, +2, +4, +6|[Ne] 3s2 3p4
17|Cl|Cloro|Chlorine|35.45|-1, +1, +3, +5, +7|[Ne] 3s2 3p5
18|Ar|Argón|Argon|39.948|0|[Ne] 3s2 3p6
19|K|Potasio|Potassium|39.098|+1|[Ar] 4s1
20|Ca|Calcio|Calcium|40.078|+2|[Ar] 4s2
21|Sc|Escandio|Scandium|44.956|+3|[Ar] 3d1 4s2
22|Ti|Titanio|Titanium|47.867|+2, +3, +4|[Ar] 3d2 4s2
23|V|Vanadio|Vanadium|50.942|+2, +3, +4, +5|[Ar] 3d3 4s2
24|Cr|Cromo|Chromium|51.996|+2, +3, +6|[Ar] 3d5 4s1
25|Mn|Manganeso|Manganese|54.938|+2, +3, +4, +6, +7|[Ar] 3d5 4s2
26|Fe|Hierro|Iron|55.845|+2, +3|[Ar] 3d6 4s2
27|Co|Cobalto|Cobalt|58.933|+2, +3|[Ar] 3d7 4s2
28|Ni|Níquel|Nickel|58.693|+2, +3|[Ar] 3d8 4s2
29|Cu|Cobre|Copper|63.546|+1, +2|[Ar] 3d10 4s1
30|Zn|Zinc|Zinc|65.38|+2|[Ar] 3d10 4s2
31|Ga|Galio|Gallium|69.723|+3|[Ar] 3d10 4s2 4p1
32|Ge|Germanio|Germanium|72.630|+2, +4|[Ar] 3d10 4s2 4p2
33|As|Arsénico|Arsenic|74.922|-3, +3, +5|[Ar] 3d10 4s2 4p3
34|Se|Selenio|Selenium|78.971|-2, +4, +6|[Ar] 3d10 4s2 4p4
35|Br|Bromo|Bromine|79.904|-1, +1, +3, +5, +7|[Ar] 3d10 4s2 4p5
36|Kr|Kriptón|Krypton|83.798|0, +2|[Ar] 3d10 4s2 4p6
37|Rb|Rubidio|Rubidium|85.468|+1|[Kr] 5s1
38|Sr|Estroncio|Strontium|87.62|+2|[Kr] 5s2
39|Y|Itrio|Yttrium|88.906|+3|[Kr] 4d1 5s2
40|Zr|Circonio|Zirconium|91.224|+2, +3, +4|[Kr] 4d2 5s2
41|Nb|Niobio|Niobium|92.906|+3, +5|[Kr] 4d4 5s1
42|Mo|Molibdeno|Molybdenum|95.95|+2, +3, +4, +5, +6|[Kr] 4d5 5s1
43|Tc|Tecnecio|Technetium|(98)|+4, +7|[Kr] 4d5 5s2
44|Ru|Rutenio|Ruthenium|101.07|+2, +3, +4, +6, +8|[Kr] 4d7 5s1
45|Rh|Rodio|Rhodium|102.91|+1, +2, +3, +4|[Kr] 4d8 5s1
46|Pd|Paladio|Palladium|106.42|+2, +4|[Kr] 4d10
47|Ag|Plata|Silver|107.87|+1, +2, +3|[Kr] 4d10 5s1
48|Cd|Cadmio|Cadmium|112.41|+2|[Kr] 4d10 5s2
49|In|Indio|Indium|114.82|+1, +3|[Kr] 4d10 5s2 5p1
50|Sn|Estaño|Tin|118.71|+2, +4|[Kr] 4d10 5s2 5p2
51|Sb|Antimonio|Antimony|121.76|-3, +3, +5|[Kr] 4d10 5s2 5p3
52|Te|Telurio|Tellurium|127.60|-2, +4, +6|[Kr] 4d10 5s2 5p4
53|I|Yodo|Iodine|126.90|-1, +1, +3, +5, +7|[Kr] 4d10 5s2 5p5
54|Xe|Xenón|Xenon|131.29|0, +2, +4, +6, +8|[Kr] 4d10 5s2 5p6
55|Cs|Cesio|Cesium|132.91|+1|[Xe] 6s1
56|Ba|Bario|Barium|137.33|+2|[Xe] 6s2
57|La|Lantano|Lanthanum|138.91|+3|[Xe] 5d1 6s2
58|Ce|Cerio|Cerium|140.12|+3, +4|[Xe] 4f1 5d1 6s2
59|Pr|Praseodimio|Praseodymium|140.91|+3, +4|[Xe] 4f3 6s2
60|Nd|Neodimio|Neodymium|144.24|+2, +3, +4|[Xe] 4f4 6s2
61|Pm|Prometio|Promethium|(145)|+3|[Xe] 4f5 6s2
62|Sm|Samario|Samarium|150.36|+2, +3|[Xe] 4f6 6s2
63|Eu|Europio|Europium|151.96|+2, +3|[Xe] 4f7 6s2
64|Gd|Gadolinio|Gadolinium|157.25|+2, +3|[Xe] 4f7 5d1 6s2
65|Tb|Terbio|Terbium|158.93|+3, +4|[Xe] 4f9 6s2
66|Dy|Disprosio|Dysprosium|162.50|+2, +3, +4|[Xe] 4f10 6s2
67|Ho|Holmio|Holmium|164.93|+3|[Xe] 4f11 6s2
68|Er|Erbio|Erbium|167.26|+3|[Xe] 4f12 6s2
69|Tm|Tulio|Thulium|168.93|+2, +3|[Xe] 4f13 6s2
70|Yb|Iterbio|Ytterbium|173.05|+2, +3|[Xe] 4f14 6s2
71|Lu|Lutecio|Lutetium|174.97|+3|[Xe] 4f14 5d1 6s2
72|Hf|Hafnio|Hafnium|178.49|+4|[Xe] 4f14 5d2 6s2
73|Ta|Tantalio|Tantalum|180.95|+3, +5|[Xe] 4f14 5d3 6s2
74|W|Wolframio|Tungsten|183.84|+2, +4, +5, +6|[Xe] 4f14 5d4 6s2
75|Re|Renio|Rhenium|186.21|+2, +4, +6, +7|[Xe] 4f14 5d5 6s2
76|Os|Osmio|Osmium|190.23|+2, +3, +4, +6, +8|[Xe] 4f14 5d6 6s2
77|Ir|Iridio|Iridium|192.22|+1, +2, +3, +4|[Xe] 4f14 5d7 6s2
78|Pt|Platino|Platinum|195.08|+2, +4, +6|[Xe] 4f14 5d9 6s1
79|Au|Oro|Gold|196.97|+1, +2, +3, +5|[Xe] 4f14 5d10 6s1
80|Hg|Mercurio|Mercury|200.59|+1, +2|[Xe] 4f14 5d10 6s2
81|Tl|Talio|Thallium|204.38|+1, +3|[Xe] 4f14 5d10 6s2 6p1
82|Pb|Plomo|Lead|207.2|+2, +4|[Xe] 4f14 5d10 6s2 6p2
83|Bi|Bismuto|Bismuth|208.98|+3, +5|[Xe] 4f14 5d10 6s2 6p3
84|Po|Polonio|Polonium|(209)|-2, +2, +4, +6|[Xe] 4f14 5d10 6s2 6p4
85|At|Astato|Astatine|(210)|-1, +1, +3, +5, +7|[Xe] 4f14 5d10 6s2 6p5
86|Rn|Radón|Radon|(222)|0, +2, +4|[Xe] 4f14 5d10 6s2 6p6
87|Fr|Francio|Francium|(223)|+1|[Rn] 7s1
88|Ra|Radio|Radium|(226)|+2|[Rn] 7s2
89|Ac|Actinio|Actinium|(227)|+3|[Rn] 6d1 7s2
90|Th|Torio|Thorium|232.04|+4|[Rn] 6d2 7s2
91|Pa|Protactinio|Protactinium|231.04|+3, +4, +5|[Rn] 5f2 6d1 7s2
92|U|Uranio|Uranium|238.03|+3, +4, +5, +6|[Rn] 5f3 6d1 7s2
93|Np|Neptunio|Neptunium|(237)|+3, +4, +5, +6, +7|[Rn] 5f4 6d1 7s2
94|Pu|Plutonio|Plutonium|(244)|+3, +4, +5, +6|[Rn] 5f6 7s2
95|Am|Americio|Americium|(243)|+3, +4, +5, +6|[Rn] 5f7 7s2
96|Cm|Curio|Curium|(247)|+3, +4|[Rn] 5f7 6d1 7s2
97|Bk|Berkelio|Berkelium|(247)|+3, +4|[Rn] 5f9 7s2
98|Cf|Californio|Californium|(251)|+2, +3, +4|[Rn] 5f10 7s2
99|Es|Einstenio|Einsteinium|(252)|+2, +3|[Rn] 5f11 7s2
100|Fm|Fermio|Fermium|(257)|+2, +3|[Rn] 5f12 7s2
101|Md|Mendelevio|Mendelevium|(258)|+2, +3|[Rn] 5f13 7s2
102|No|Nobelio|Nobelium|(259)|+2, +3|[Rn] 5f14 7s2
103|Lr|Lawrencio|Lawrencium|(266)|+3|[Rn] 5f14 7s2 7p1
104|Rf|Rutherfordio|Rutherfordium|(267)|+4|[Rn] 5f14 6d2 7s2
105|Db|Dubnio|Dubnium|(268)|+4, +5|[Rn] 5f14 6d3 7s2
106|Sg|Seaborgio|Seaborgium|(269)|+4, +5, +6|[Rn] 5f14 6d4 7s2
107|Bh|Bohrio|Bohrium|(270)|+4, +5, +7|[Rn] 5f14 6d5 7s2
108|Hs|Hasio|Hassium|(269)|+6, +8|[Rn] 5f14 6d6 7s2
109|Mt|Meitnerio|Meitnerium|(278)|+1, +3|[Rn] 5f14 6d7 7s2
110|Ds|Darmstatio|Darmstadtium|(281)|+2, +4, +6|[Rn] 5f14 6d8 7s2
111|Rg|Roentgenio|Roentgenium|(282)|+1, +3|[Rn] 5f14 6d9 7s2
112|Cn|Copernicio|Copernicium|(285)|+2, +4|[Rn] 5f14 6d10 7s2
113|Nh|Nihonio|Nihonium|(286)|+1, +3|[Rn] 5f14 6d10 7s2 7p1
114|Fl|Flerovio|Flerovium|(289)|+2, +4|[Rn] 5f14 6d10 7s2 7p2
115|Mc|Moscovio|Moscovium|(290)|+1, +3|[Rn] 5f14 6d10 7s2 7p3
116|Lv|Livermorio|Livermorium|(293)|+2, +4|[Rn] 5f14 6d10 7s2 7p4
117|Ts|Teneso|Tennessine|(294)|-1, +1, +3, +5|[Rn] 5f14 6d10 7s2 7p5
118|Og|Oganesón|Oganesson|(294)|0, +2, +4|[Rn] 5f14 6d10 7s2 7p6
`.trim();

/* Lista procesada: { z, simbolo, nombre, nombreEn, masa, estados, config } */
const LISTA = DATOS.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
  const p = l.split("|");
  return {
    z: Number(p[0]),
    simbolo: p[1],
    nombre: p[2],
    nombreEn: p[3],
    masa: p[4],
    estados: p[5],
    config: p[6],
  };
});

/* Núcleos de gas noble COMPLETOS: la configuración completa se
   construye expandiendo el corchete de la reducida. */
const NUCLEOS = {
  He: "1s2",
  Ne: "1s2 2s2 2p6",
  Ar: "1s2 2s2 2p6 3s2 3p6",
  Kr: "1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6",
  Xe: "1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6",
  Rn: "1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 4f14 5d10 6s2 6p6",
};

function configCompleta(configReducida) {
  const m = String(configReducida).match(/^\[(He|Ne|Ar|Kr|Xe|Rn)\]\s*(.*)$/);
  if (!m) return String(configReducida);
  return NUCLEOS[m[1]] + (m[2] ? " " + m[2] : "");
}

/* «1s2 2p6» → HTML con exponentes: 1s<sup>2</sup> 2p<sup>6</sup> */
function configHtml(config) {
  return String(config).replace(/([spdf])(\d{1,2})/g, '$1<sup>$2</sup>');
}

/* ── Periodo, grupo y bloque (posición en la tabla periódica) ── */
function periodoDe(z) {
  if (z <= 2) return 1;
  if (z <= 10) return 2;
  if (z <= 18) return 3;
  if (z <= 36) return 4;
  if (z <= 54) return 5;
  if (z <= 86) return 6;
  return 7;
}

/* null = elemento interno de la serie f (lantánidos / actínidos),
   que se muestra con «—» en la tarjeta. */
function grupoDe(z) {
  if (z === 1) return "1";
  if (z === 2) return "18";
  if ((z >= 57 && z <= 71) || (z >= 89 && z <= 103)) return null;
  if (z <= 4) return String(z - 2);        // 3→1, 4→2
  if (z <= 10) return String(z + 8);       // 5→13 … 10→18
  if (z <= 12) return String(z - 10);      // 11→1, 12→2
  if (z <= 18) return String(z);           // 13→13 … 18→18
  if (z <= 20) return String(z - 18);      // 19→1, 20→2
  if (z <= 36) return String(z - 18);      // 21→3  … 36→18
  if (z <= 38) return String(z - 36);      // 37→1, 38→2
  if (z <= 54) return String(z - 36);      // 39→3  … 54→18
  if (z <= 56) return String(z - 54);      // 55→1, 56→2
  if (z <= 86) return String(z - 68);      // 72→4  … 86→18
  if (z <= 88) return String(z - 86);      // 87→1, 88→2
  return String(z - 100);                  // 104→4 … 118→18
}

function bloqueDe(z) {
  if ((z >= 57 && z <= 71) || (z >= 89 && z <= 103)) return "f";
  if (z === 1 || z === 2 || [3, 4, 11, 12, 19, 20, 37, 38, 55, 56, 87, 88].includes(z)) return "s";
  if ([5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 31, 32, 33, 34, 35, 36,
    49, 50, 51, 52, 53, 54, 81, 82, 83, 84, 85, 86,
    113, 114, 115, 116, 117, 118].includes(z)) return "p";
  return "d"; // 21–30, 39–48, 72–80, 104–112
}

/* ── Categoría / familia (gama de color de la tarjeta) ── */
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

/* Gamas por categoría: borde y acentos claros (c), texto/acento
   oscuro (t) y fondo suave (suave). */
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

/* Familia con los DOS idiomas: [español, english] */
const FAMILIAS = {
  alcalino:       ["Metal alcalino", "Alkali metal"],
  alcalinoterreo: ["Metal alcalinotérreo", "Alkaline earth metal"],
  transicion:     ["Metal de transición", "Transition metal"],
  lantanido:      ["Lantánido", "Lanthanide"],
  actinido:       ["Actínido", "Actinide"],
  otroMetal:      ["Otro metal", "Post-transition metal"],
  metaloide:      ["Metaloide", "Metalloid"],
  noMetal:        ["No metal", "Nonmetal"],
  halogeno:       ["Halógeno", "Halogen"],
  noble:          ["Gas noble", "Noble gas"],
};

/* ── Rótulos de la tarjeta en los dos idiomas ── */
const ETIQUETAS = {
  es: {
    numAtomico: "Número atómico",
    masaExacta: "Masa atómica (exacta)",
    masaAproximada: "Masa atómica aproximada",
    protones: "Protones",
    electrones: "Electrones",
    neutrones: "Neutrones (A − Z)",
    periodo: "Periodo",
    grupo: "Grupo",
    bloque: "Bloque",
    oxidacion: "Estados de oxidación",
    confCompleta: "Configuración electrónica completa",
    confReducida: "Configuración electrónica reducida",
    sinGrupo: "—",
    errorTitulo: "Elemento no encontrado",
  },
  en: {
    numAtomico: "Atomic number",
    masaExacta: "Atomic mass (exact)",
    masaAproximada: "Approximate atomic mass",
    protones: "Protons",
    electrones: "Electrons",
    neutrones: "Neutrons (A − Z)",
    periodo: "Period",
    grupo: "Group",
    bloque: "Block",
    oxidacion: "Oxidation states",
    confCompleta: "Full electron configuration",
    confReducida: "Shorthand electron configuration",
    sinGrupo: "—",
    errorTitulo: "Element not found",
  },
};

/* ── Ayudantes de texto/validación ── */
function normaliza(s) {
  return String(s ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* Masa numérica (acepta «(98)») para contar neutrones */
function masaNumero(masa) {
  const n = parseFloat(String(masa).replace(/[()]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/* «22.990» → «22,990» en español; «(98)» queda igual */
function masaTexto(masa, idioma) {
  const t = String(masa);
  return idioma === "es" ? t.replace(".", ",") : t;
}

function numeroSeguro(valor, defecto) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : defecto;
}

/* Índices de búsqueda (construidos UNA sola vez) */
let _porSimbolo = null;
let _porNombre = null;

function indices() {
  if (_porSimbolo) return;
  _porSimbolo = new Map();
  _porNombre = new Map();
  for (const el of LISTA) {
    _porSimbolo.set(el.simbolo, el);
    _porNombre.set(normaliza(el.nombre), el);
    _porNombre.set(normaliza(el.nombreEn), el);
  }
}

/* ── Mensajes de aviso (la tarjeta de error también es bilingüe) ── */
const AVISOS = {
  ningunDato: {
    es: 'Escribe <b>al menos un dato</b> del elemento: número atómico (1–118), símbolo («Na») o nombre («sodio» / «sodium»). Con uno bien escrito, los otros quedan opcionales.',
    en: 'Provide <b>at least one datum</b> for the element: atomic number (1–118), symbol («Na») or name («sodium» / «sodio»). One correct datum is enough.',
  },
  numero: {
    es: (x) => '«' + esc(x) + '» no es un número atómico válido. Escribe un <b>entero entre 1 y 118</b> — ej: 11 para el sodio.',
    en: (x) => '«' + esc(x) + '» is not a valid atomic number. Use a <b>whole number from 1 to 118</b> — e.g. 11 for sodium.',
  },
  simboloMayus: {
    es: (bueno, x) => 'El símbolo <b>SÍ distingue mayúsculas</b>: escribiste «' + esc(x) + '» pero el correcto es «<b>' + esc(bueno) + '</b>».',
    en: (bueno, x) => 'Symbols are <b>case-sensitive</b>: you wrote «' + esc(x) + '» but the correct one is «<b>' + esc(bueno) + '</b>».',
  },
  simbolo: {
    es: (x) => '«' + esc(x) + '» no es el símbolo de ningún elemento (los 118 símbolos van del H al Og). Revisa la grafía exacta.',
    en: (x) => '«' + esc(x) + '» is not the symbol of any element (the 118 symbols run from H to Og). Check the exact spelling.',
  },
  nombre: {
    es: (x) => 'No encontré ningún elemento llamado «' + esc(x) + '». Escribe el nombre en <b>español o inglés</b> — ej: «sodio» o «sodium».',
    en: (x) => 'No element named «' + esc(x) + '» was found. Use the name in <b>Spanish or English</b> — e.g. «sodium» or «sodio».',
  },
};

/* ── BÚSQUEDA INTERNA del elemento ──
   Prioridad: numeroAtomico › simbolo › nombre. Devuelve
   { ok: true, el } o { ok: false, mensaje } (HTML ya escapado). */
function buscarElemento(opc, idioma) {
  const numero = String(opc.numeroAtomico ?? "").trim();
  const simbolo = String(opc.simbolo ?? "").trim();
  const nombre = String(opc.nombre ?? "").trim();

  if (numero !== "") {
    const n = Number(numero);
    if (Number.isInteger(n) && n >= 1 && n <= 118) {
      indices();
      return { ok: true, el: LISTA[n - 1] };
    }
    return { ok: false, mensaje: AVISOS.numero[idioma](numero) };
  }

  if (simbolo !== "") {
    indices();
    const exacto = _porSimbolo.get(simbolo);
    if (exacto) return { ok: true, el: exacto };
    /* ¿Era el símbolo correcto pero con mayúsculas/minúsculas mal? */
    const insensible = LISTA.find((e) => e.simbolo.toLowerCase() === simbolo.toLowerCase());
    if (insensible) {
      return { ok: false, mensaje: AVISOS.simboloMayus[idioma](insensible.simbolo, simbolo) };
    }
    return { ok: false, mensaje: AVISOS.simbolo[idioma](simbolo) };
  }

  if (nombre !== "") {
    indices();
    const el = _porNombre.get(normaliza(nombre));
    if (el) return { ok: true, el };
    return { ok: false, mensaje: AVISOS.nombre[idioma](nombre) };
  }

  return { ok: false, mensaje: AVISOS.ningunDato[idioma] };
}

/* #rrggbb → rgba(r, g, b, alfa) (para las líneas divisorias) */
function hexARgba(hex, alfa) {
  const m = String(hex).replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return "rgba(" + ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ", " + alfa + ")";
}

/* ════════════════════════════════════════════════════════════════════
   TARJETA — construye el cuadrado perfecto, lo muestra centrado en
   el <body> (o en el contenedor pedido) y lo devuelve.
   ════════════════════════════════════════════════════════════════════ */

export function mostrarTarjetaElemento(opciones = {}) {
  inyectarEstilos();
  const opc = opciones || {};

  /* Idioma: «english»/«en»/«inglés»/«ingles» → en; todo lo demás → es */
  const idioma = /^(en\b|english|ingl)/.test(normaliza(opc.idioma)) ? "en" : "es";
  const et = ETIQUETAS[idioma];

  /* Lado del cuadrado en px (encoge solo si la pantalla es angosta) */
  const tamano = Math.min(1200, Math.max(220, numeroSeguro(opc.tamano, 560)));

  const resultado = buscarElemento(opc, idioma);
  const escena = document.createElement("div");
  escena.className = "tq-escena";
  escena.style.setProperty("--tq-lado", tamano + "px");

  const tarjeta = document.createElement("div");
  tarjeta.className = "tq-tarjeta";
  tarjeta.dataset.idioma = idioma;
  tarjeta.setAttribute("role", "group");

  let aria = "";

  if (resultado.ok) {
    const el = resultado.el;
    const cat = categoriaDe(el.z);
    const gama = GAMAS[cat];
    const familia = FAMILIAS[cat][idioma === "es" ? 0 : 1];

    /* Gama de color según la categoría del elemento */
    escena.style.setProperty("--tq-c", gama.c);
    escena.style.setProperty("--tq-t", gama.t);
    escena.style.setProperty("--tq-suave", gama.suave);
    escena.style.setProperty("--tq-linea", hexARgba(gama.c, 0.3));

    /* Partículas subatómicas: protones = electrones = Z;
       neutrones = número másico (masa redondeada a entero) − Z.
       La masa APROXIMADA que se muestra lleva DOS decimales. */
    const numeroMasico = Math.round(masaNumero(el.masa));
    const neutrones = numeroMasico - el.z;
    const masaAprox = masaNumero(el.masa).toFixed(2);
    const grupo = grupoDe(el.z);
    const nombrePrincipal = idioma === "es" ? el.nombre : el.nombreEn;
    const nombreAlternativo = idioma === "es" ? el.nombreEn : el.nombre;
    const oxis = el.estados.split(",").map((s) => s.trim()).filter(Boolean)
      .map((s) => '<span class="tq-oxi">' + esc(s) + "</span>").join("");

    aria = idioma === "es"
      ? "Tarjeta del elemento " + el.nombre + " (" + el.simbolo + "), número atómico " + el.z
      : "Element card for " + el.nombreEn + " (" + el.simbolo + "), atomic number " + el.z;

    tarjeta.dataset.z = String(el.z);
    tarjeta.dataset.simbolo = el.simbolo;

    tarjeta.innerHTML = `
      <div class="tq-cabecera">
        <div class="tq-z">
          <span class="tq-z-num">${el.z}</span>
          <span class="tq-z-et">${et.numAtomico}</span>
        </div>
        <div class="tq-centro">
          <span class="tq-simbolo">${esc(el.simbolo)}</span>
          <span class="tq-nombre">${esc(nombrePrincipal)}</span>
          <span class="tq-nombre-alt">${esc(nombreAlternativo)}</span>
        </div>
        <span class="tq-familia">${esc(familia)}</span>
      </div>
      <div class="tq-cuerpo">
        <div class="tq-celda"><span class="tq-et">${et.masaExacta}</span><span class="tq-val">${esc(masaTexto(el.masa, idioma))} u</span></div>
        <div class="tq-celda"><span class="tq-et">${et.masaAproximada}</span><span class="tq-val">${esc(masaTexto(masaAprox, idioma))} u</span></div>
        <div class="tq-celda"><span class="tq-et">${et.protones}</span><span class="tq-val">${el.z}</span></div>
        <div class="tq-celda"><span class="tq-et">${et.electrones}</span><span class="tq-val">${el.z}</span></div>
        <div class="tq-celda"><span class="tq-et">${et.neutrones}</span><span class="tq-val">${neutrones}</span></div>
        <div class="tq-celda"><span class="tq-et">${et.periodo}</span><span class="tq-val">${periodoDe(el.z)}</span></div>
        <div class="tq-celda"><span class="tq-et">${et.grupo}</span><span class="tq-val">${grupo ?? et.sinGrupo}</span></div>
        <div class="tq-celda"><span class="tq-et">${et.bloque}</span><span class="tq-val">${bloqueDe(el.z)}</span></div>
        <div class="tq-fila"><span class="tq-et">${et.oxidacion}</span><span class="tq-oxis">${oxis}</span></div>
        <div class="tq-fila"><span class="tq-et">${et.confCompleta}</span><span class="tq-val tq-config">${configHtml(configCompleta(el.config))}</span></div>
        <div class="tq-fila"><span class="tq-et">${et.confReducida}</span><span class="tq-val tq-config">${configHtml(el.config)}</span></div>
      </div>`;
  } else {
    tarjeta.classList.add("tq-error");
    aria = idioma === "es"
      ? "Tarjeta de aviso: elemento no encontrado"
      : "Notice card: element not found";
    tarjeta.innerHTML = `
      <div class="tq-cabecera">
        <div class="tq-z">
          <span class="tq-z-num">!</span>
          <span class="tq-z-et">${et.errorTitulo}</span>
        </div>
        <div class="tq-centro"><span class="tq-simbolo">?</span></div>
        <span class="tq-familia">${idioma === "es" ? "Química" : "Chemistry"}</span>
      </div>
      <div class="tq-error-cuerpo">
        <span class="tq-error-icono">!</span>
        <span class="tq-error-titulo">${et.errorTitulo}</span>
        <span class="tq-error-msj">${resultado.mensaje}</span>
      </div>`;
  }

  tarjeta.setAttribute("aria-label", aria);
  escena.appendChild(tarjeta);

  /* Sin contenedor: la tarjeta se muestra DIRECTAMENTE centrada en
     el cuerpo de la página. Con contenedor: se agrega allí (la usa
     la vista previa del editor «Crear» y las páginas generadas). */
  if (opc.contenedor && typeof opc.contenedor.appendChild === "function") {
    opc.contenedor.appendChild(escena);
  } else {
    const caja = document.createElement("div");
    caja.className = "tq-caja";
    caja.appendChild(escena);
    document.body.appendChild(caja);
  }

  return tarjeta;
}