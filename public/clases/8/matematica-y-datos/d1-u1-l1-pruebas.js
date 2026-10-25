// ============================================================
// CLASE generada con el editor «Crear» — Mis Clases Online
// Tipo: clase · ID: — · Título: Mis Clases Online
// Fecha: 25 de octubre de 2026
//
// CÓMO USARLO
//   1. Guarda este archivo (con el nombre del ID) 3 carpetas
//      dentro de donde está js/:  clases/{grado}/{materia}/mi-clase.js
//      p. ej.  public/clases/8/algebra/mi-clase.js  — desde ahí
//      las rutas ../../../js/… apuntan a la carpeta js/ del
//      proyecto (ahí están components, componentes y utils).
//   2. Se abre desde «Clases» con render(perfil, contenedor, clase).
//
// CARGA A PRUEBA DE RUTAS: los módulos NO se importan arriba
// (un archivo faltante mataba la página entera con «Failed to
// fetch…»). Se cargan con cargar(), que reintenta sin caché,
// verifica las exportaciones y avisa el motivo exacto.
//
// PARA AGREGAR UN BLOQUE NUEVO (dentro de montar()):
//   1. si su fábrica aún no está, UNA línea cargar() más —
//        const { crearParrafo } = await cargar("../../../js/componentes/parrafo.js", ["crearParrafo"]);
//   2. UNA línea del bloque, dentro de su lámina —
//        crearParrafo({ texto: "…", contenedor: pon(l1, 0, 240, 820) });
// (las posiciones y medidas en px salieron del editor al guardar).
// ============================================================

let estilosListos = false;

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "mco-generada-estilos";
  estilo.textContent = `
    .mco-generada {
      max-width: 820px;
      margin: 0 auto;
      padding: 1.25rem clamp(1rem, 4vw, 2rem) 2.5rem;
      font-family: system-ui, sans-serif;
    }
    .cg-volver {
      display: inline-flex; align-items: center; gap: .3rem;
      border: 1px solid #e5e7eb; background: #ffffff; color: #4b5563;
      border-radius: 999px; padding: .42rem .85rem;
      font-size: .85rem; font-weight: 600; cursor: pointer;
      margin-bottom: 1rem;
    }
    .cg-volver:hover { border-color: #7c3aed; color: #7c3aed; }
    .cg-aviso {
      display: flex; align-items: center; gap: .4rem;
      border: 2px solid #dc2626; background: #fef2f2; color: #b91c1c;
      border-radius: .7rem; padding: .6rem .8rem;
      font-size: .85rem; font-weight: 600; margin-bottom: 1rem;
    }
    .cg-aviso[hidden] { display: none; }
    .cg-fallo {
      border: 2px solid #dc2626; background: #fef2f2; color: #b91c1c;
      border-radius: .8rem; padding: .9rem 1rem; font-size: .9rem;
      line-height: 1.5; margin-bottom: 1rem;
    }
    .cg-fallo b { display: block; margin-bottom: .3rem; }
    .cg-lienzo { position: relative; isolation: isolate; }
    .cg-lamina { position: relative; }
    .cg-bloque { position: absolute; z-index: 1; }
    .cg-fondo { position: absolute; z-index: 0; }
  `;
  document.head.append(estilo);
}

// ─── Carga de módulos A PRUEBA DE RUTAS (con reintento) ───

const MCO_MODULOS = new Map();

async function cargar(spec, nombres) {
  if (!MCO_MODULOS.has(spec)) {
    MCO_MODULOS.set(
      spec,
      import(spec).catch(() => {
        // reintento ÚNICO sin caché (Live Server recién arrancado…)
        const url = spec + (spec.includes("?") ? "&" : "?") + "mco=" + Date.now();
        return import(url).catch(() => {
          throw new Error("No se pudo cargar " + spec + " — revisa que ese archivo exista en tu proyecto (viene en la entrega) y recarga con F5.");
        });
      })
    );
  }
  const mod = await MCO_MODULOS.get(spec);
  const faltan = (nombres || []).filter((n) => typeof mod[n] !== "function");
  if (faltan.length) {
    throw new Error("El archivo " + spec + " SÍ está, pero no exporta " + faltan.join(", ") + ": es una copia vieja. Reemplázalo con el de la última entrega y recarga (F5).");
  }
  return mod;
}

// ─── Ayudantes (incluidos para que agregar bloques sea fácil) ───

// Una LÁMINA (sección) del documento: su ESPACIO en px.
// El documento completo mide 820; con ancho menor se respeta.
function lamina(altoPx, anchoPx) {
  const d = document.createElement("div");
  d.className = "cg-lamina";
  if (altoPx) d.style.minHeight = Math.round(altoPx) + "px";
  if (anchoPx && anchoPx < 820) d.style.width = Math.round(anchoPx) + "px";
  return d;
}

// La CAJA de un bloque dentro de la lámina: posición y medida en
// px (las que salieron del editor). Pásasela como `contenedor`.
function pon(laminaDestino, x, y, ancho, alto) {
  const caja = document.createElement("div");
  caja.className = "cg-bloque";
  caja.style.left = x + "px";
  caja.style.top = y + "px";
  if (ancho) caja.style.width = ancho + "px";
  if (alto) caja.style.minHeight = alto + "px";
  laminaDestino.appendChild(caja);
  return caja;
}

// Igual que pon() pero para una figura de FONDO (debajo del texto).
function fondo(laminaDestino, x, y) {
  const caja = pon(laminaDestino, x, y);
  caja.className = "cg-fondo";
  return caja;
}

// Contenido de la pieza (lo llama la vista al abrirla)
export function render(perfil, contenedor, clase) {
  if (!perfil || !contenedor) return;
  inyectarEstilos();
  contenedor.removeAttribute("data-mco-listo");   // se marca al terminar montar()

  contenedor.innerHTML = `
    <div class="mco-generada">
      <button class="cg-volver" id="cg-volver" type="button">
        <sl-icon name="arrow-left"></sl-icon> Volver
      </button>
      <div class="cg-lienzo" id="cg-lienzo"></div>
    </div>`;

  // Todo el montaje es asíncrono (los módulos van con cargar()):
  // si algo falta, la página AVISA en vez de morir en blanco.
  montar(perfil, contenedor, clase).catch((e) => {
    console.warn("[mco-generada]", e);
    const zona = contenedor.querySelector("#cg-lienzo");
    if (zona) {
      const fallo = document.createElement("div");
      fallo.className = "cg-fallo";
      fallo.innerHTML = "<b>No se pudo armar la clase.</b> " + (e && e.message ? e.message : e);
      zona.appendChild(fallo);
    }
  });
}

async function montar(perfil, contenedor, clase) {
  const lienzo = contenedor.querySelector("#cg-lienzo");
  const volver = contenedor.querySelector("#cg-volver");

  // ── Módulos usados (con reintento y aviso claro si falta uno) ──
  const { crearFormatoTexto } = await cargar("../../../js/componentes/formatoTexto.js", ["crearFormatoTexto"]);
  const { crearSecciones } = await cargar("../../../js/componentes/section.js", ["crearSecciones"]);
  const { renderInicio } = await cargar("../../../js/components/inicio.js", ["renderInicio"]);
  const { renderUserbar } = await cargar("../../../js/components/userbar.js", ["renderUserbar"]);

  renderUserbar(perfil, "Mis Clases Online");

  // ── Volver: la flecha al INICIO (la llevan clase, tarea y examen) ──
  volver.addEventListener("click", () => {
    renderUserbar(perfil);
    renderInicio(perfil, contenedor);
  });

    // ════ Sección 1 — espacio de 820×783 px ════
    const l1 = lamina(783, 820);

  // ── Texto con formato · mide 820×62 px ──
  crearFormatoTexto({
    texto: "✏️ {{Copia en tu cuaderno|naranja}}",
    tamano: 28,
    contenedor: pon(l1, 0, 10, 820, 62)
  });

  // ── Documento final: CORRIDO con 1 sección; con 2 o más, una a la vez ──
  crearSecciones({
    contenedor: lienzo,
    secciones: [l1],
  });

  contenedor.setAttribute("data-mco-listo", "1");   // TODO quedó montado
}