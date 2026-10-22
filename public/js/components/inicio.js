// ============================================================
// inicio.js — Vista de inicio (js/components/inicio.js)
//
// Se muestra bajo la userbar cuando hay sesión iniciada.
//
// Según el rol del perfil dibuja las tarjetas de módulos:
// - Estudiante: Clases, Exámenes, Recursos, Tareas
// - Docente:    Asistencia, Clases, Estudiantes, Exámenes,
//               Recursos, Tareas
// Las tarjetas salen de una función que SIEMPRE las ordena
// alfabéticamente por título (sort + localeCompare "es").
//
// Navegación: al hacer CLIC en una tarjeta se intenta cargar
// js/components/<titulo-sin-acentos>.js (ej. examenes.js).
// - Si el módulo existe y exporta render(perfil, contenedor),
//   se muestra su vista (reemplaza el inicio, bajo la userbar).
// - Si NO existe → toast de "no está disponible todavía".
//
// Hover: la tarjeta crece y colorea su borde izquierdo e
// inferior con el color de la tarjeta (sin saltos de layout:
// los bordes siempre están reservados en transparente).
//
// Convención: CSS implícito (inyectado aquí, sin archivos .css extra)
// · 100% responsiva · todo el contenido va DEBAJO de la userbar.
// ============================================================

import { escapeHtml } from "../utils/helpers.js";

let estilosListos = false;

/* ---------------- Helpers ---------------- */

// "#2563eb", 0.12 → "rgba(37, 99, 235, 0.12)"
function rgba(hex, alfa) {
  const n = (hex || "#000000").replace("#", "");
  return `rgba(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)}, ${alfa})`;
}

// palabra[0] + palabra[2] ("Ana Maria Lopez" → "Ana Lopez")
function nombreCorto(nombreCompleto) {
  const p = (nombreCompleto || "").trim().split(/\s+/);
  return [p[0], p[2] ?? p[1] ?? ""].filter(Boolean).join(" ");
}

// Toast de aviso (mismo patrón que auth.js; warning por defecto)
function notify(mensaje, variant = "warning") {
  try {
    const alerta = document.createElement("sl-alert");
    alerta.setAttribute("variant", variant);
    alerta.setAttribute("closable", "");
    alerta.setAttribute("duration", "4000");
    alerta.textContent = mensaje;
    // Nota: NO remover el toast a mano (NotFoundError: removeChild).
    document.body.append(alerta);
    customElements.whenDefined("sl-alert").then(() => alerta.toast());
  } catch (e) {
    console.warn("[aviso]", mensaje);
  }
}

// "Exámenes" → "examenes.js" (minúsculas y sin acentos)
function archivoDe(titulo) {
  const limpio = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return `./${limpio}.js`;
}

/**
 * Abre la página de una tarjeta al hacer clic.
 * Cada página vive en js/components/<titulo>.js y DEBE exportar
 * render(perfil, contenedor). Si el módulo no existe (o no tiene
 * render), solo avisa que no está disponible.
 */
async function abrirPagina(titulo, perfil, contenedor) {
  try {
    const mod = await import(archivoDe(titulo));
    if (typeof mod.render === "function") {
      mod.render(perfil, contenedor);
    } else {
      notify(`«${titulo}» todavía no está disponible.`);
    }
  } catch (e) {
    notify(`«${titulo}» todavía no está disponible.`);
  }
}

/**
 * Tarjetas del usuario según su rol.
 * Devuelve la lista ORDENADA alfabéticamente por título.
 */
function tarjetasDe(perfil) {
  const esDocente = perfil.rol === "docente";

  const lista = [
    {
      titulo: "Clases",
      icono: "book",
      color: "#2563eb", // azul
      desc: esDocente ? "Tus clases asignadas" : "Las clases de tu grado",
    },
    {
      titulo: "Exámenes",
      icono: "file-earmark-text",
      color: "#ef4444", // rojo
      desc: "Próximos exámenes y resultados",
    },
    {
      titulo: "Recursos",
      icono: "folder2-open",
      color: "#16a34a", // verde
      desc: "Material y archivos de apoyo",
    },
    {
      titulo: "Tareas",
      icono: "list-check",
      color: "#7c3aed", // morado
      desc: esDocente ? "Tareas asignadas" : "Tus tareas pendientes",
    },
  ];

  // Exclusivas del docente
  if (esDocente) {
    lista.push(
      {
        titulo: "Asistencia",
        icono: "clipboard-check",
        color: "#f97316", // naranja
        desc: "Registro de asistencia",
      },
      {
        titulo: "Crear",
        icono: "magic",
        color: "#db2777", // rosa
        desc: "Editor visual: arma tu clase, tarea o examen",
      },
      {
        titulo: "Estudiantes",
        icono: "people",
        color: "#0891b2", // cian
        desc: "Lista de tus estudiantes",
      }
    );
  }

  // Orden alfabético por título (regla del proyecto)
  return lista.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
}

/* ---------------- CSS implícito ---------------- */

function inyectarEstilos() {
  if (estilosListos) return;
  estilosListos = true;
  const estilo = document.createElement("style");
  estilo.id = "inicio-estilos";
  estilo.textContent = `
    .inicio-vista {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1.5rem clamp(1rem, 4vw, 2rem) 2.5rem;
      font-family: system-ui, sans-serif;
    }

    .inicio-encabezado h2 {
      margin: 0 0 .2rem;
      font-size: 1.35rem;
      font-weight: 800;
      color: #7c3aed; /* morado */
    }
    .inicio-encabezado p {
      margin: 0 0 1.25rem;
      color: #6b7280;
      font-size: .95rem;
    }

    .inicio-tarjetas {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 1rem;
    }

    .inicio-tarjeta {
      background: #ffffff;
      border: 1px solid #ece9f6;
      /* Bordes izquierdo/inferior SIEMPRE reservados en transparente:
         al colorearse en el hover nada se mueve (cero salto de layout) */
      border-left: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-radius: 1.1rem;
      padding: 1.1rem;
      box-shadow: 0 4px 16px rgba(17, 12, 46, .06);
      cursor: pointer;
      user-select: none;
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .inicio-tarjeta:hover {
      transform: scale(1.045);
      border-left-color: var(--acento, #7c3aed);
      border-bottom-color: var(--acento, #7c3aed);
      box-shadow: 0 10px 26px rgba(17, 12, 46, .14);
    }
    .inicio-tarjeta:active {
      transform: scale(1.015);
    }

    .inicio-icono {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: .9rem;
      background: var(--acento-fondo, #f3f0ff);
      color: var(--acento, #7c3aed);
      font-size: 1.4rem;
      margin-bottom: .7rem;
    }

    .inicio-tarjeta h3 {
      margin: 0 0 .15rem;
      font-size: 1.02rem;
      color: #1f2937;
    }
    .inicio-tarjeta p {
      margin: 0;
      font-size: .82rem;
      color: #9ca3af;
      line-height: 1.35;
    }

    /* Celular: encabezado un poco más compacto */
    @media (max-width: 767px) {
      .inicio-encabezado h2 { font-size: 1.2rem; }
    }
  `;
  document.head.append(estilo);
}

/* ---------------- API pública ---------------- */

/**
 * Dibuja la vista de inicio (tarjetas según el rol, bajo la userbar).
 * @param {object} perfil           perfil del usuario (users/{uid})
 * @param {HTMLElement} contenedor  dónde dibujar (main#app)
 */
export function renderInicio(perfil, contenedor) {
  if (!perfil || !contenedor) return;
  inyectarEstilos();

  const corto = nombreCorto(perfil.nombre);
  const saludo = perfil.rol === "docente"
    ? "¿Qué vamos a trabajar hoy?"
    : "¿Qué quieres hacer hoy?";

  const tarjetas = tarjetasDe(perfil);

  contenedor.innerHTML = `
    <div class="inicio-vista">
      <section class="inicio-encabezado">
        <h2>¡Hola, ${escapeHtml(corto)}!</h2>
        <p>${escapeHtml(saludo)}</p>
      </section>

      <section class="inicio-tarjetas">
        ${tarjetas.map((t) => `
          <article class="inicio-tarjeta"
                   data-titulo="${escapeHtml(t.titulo)}"
                   style="--acento: ${t.color}; --acento-fondo: ${rgba(t.color, 0.12)}">
            <span class="inicio-icono"><sl-icon name="${t.icono}"></sl-icon></span>
            <h3>${escapeHtml(t.titulo)}</h3>
            <p>${escapeHtml(t.desc)}</p>
          </article>`).join("")}
      </section>
    </div>`;

  // Clic en cada tarjeta → intentar abrir su página
  contenedor.querySelectorAll(".inicio-tarjeta").forEach((tarjeta) => {
    tarjeta.addEventListener("click", () => {
      abrirPagina(tarjeta.dataset.titulo, perfil, contenedor);
    });
  });
}
