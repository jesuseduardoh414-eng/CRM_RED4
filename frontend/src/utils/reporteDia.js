/**
 * Reporte imprimible de la actividad de un día.
 *
 * El documento se arma como HTML dentro de un iframe oculto y se manda a
 * imprimir: el navegador ofrece "Guardar como PDF" y así no hace falta ninguna
 * librería de PDF ni un endpoint aparte. Se usa un iframe en vez de una pestaña
 * nueva porque no lo bloquea el antipop-ups y no deja pestañas huérfanas.
 *
 * `filas` viene ya recortado por quien llama: solo las personas que cerraron al
 * menos una tarea ese día, en el orden en que deben salir impresas.
 */

const escapar = (valor) => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Papel blanco y tinta negra a propósito: el reporte se imprime o se guarda en
// PDF, así que aquí no aplican las variables de tema de la aplicación.
const ESTILOS = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #111827;
    font-size: 11px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cabecera { border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 18px; }
  .cabecera h1 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
  .cabecera .fecha { margin: 3px 0 0; font-size: 12px; color: #374151; }
  .cabecera .filtro { margin: 6px 0 0; font-size: 10px; color: #6b7280; }

  .persona { margin-bottom: 16px; break-inside: avoid; page-break-inside: avoid; }
  .persona-cab {
    display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
    border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin-bottom: 6px;
  }
  .persona-cab .nombre { font-size: 13px; font-weight: 600; }
  .persona-cab .area { font-size: 10px; color: #6b7280; font-weight: 400; margin-left: 6px; }
  .persona-cab .conteo { font-size: 10px; color: #374151; white-space: nowrap; }

  .bloque-titulo {
    font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em;
    color: #6b7280; font-weight: 600; margin: 8px 0 4px;
  }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 0; vertical-align: top; border-bottom: 1px solid #f3f4f6; }
  td.tarea { width: auto; }
  td.proyecto { width: 26%; color: #6b7280; padding-left: 10px; }
  td.dato { width: 86px; text-align: right; color: #6b7280; white-space: nowrap; }
  .curso td { color: #4b5563; }

  .vacio { color: #6b7280; font-style: italic; padding: 24px 0; }
  .pie {
    margin-top: 20px; padding-top: 8px; border-top: 1px solid #d1d5db;
    font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; gap: 12px;
  }
`;

const filaTarea = (tarea, dato, clase = '') => `
  <tr class="${clase}">
    <td class="tarea">${escapar(tarea.titulo)}</td>
    <td class="proyecto">${escapar(tarea.proyecto?.nombre || '—')}</td>
    <td class="dato">${escapar(dato || '')}</td>
  </tr>`;

/**
 * Documento completo del reporte. Va aparte de la impresión para poder
 * revisarlo sin navegador de por medio.
 *
 * @param {object} opciones
 * @param {Array}  opciones.filas    [{ miembro, hechas, enProgreso }]
 * @param {object} opciones.textos   etiquetas ya traducidas
 * @param {string} opciones.locale   para formatear horas y fechas
 */
export const construirHtmlReporte = ({ filas = [], textos = {}, locale = 'es-MX' }) => {
  // Las etiquetas llegan como plantillas ('Terminadas: {count}') y aquí se
  // rellenan con los totales. Con respaldo vacío para que una etiqueta que
  // falte deje un hueco y no rompa la impresión a medias.
  const plantilla = (clave) => String(textos[clave] ?? '');

  const hora = (valor) => (valor
    ? new Date(valor).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : '');
  // En el bloque de "en curso" la fecha sola no dice nada, así que va con su
  // etiqueta ("Vence 14 ago"); en el de terminadas basta la hora de cierre.
  const vence = (valor) => (valor
    ? plantilla('vence').replace('{fecha}', new Date(valor).toLocaleDateString(locale, { day: '2-digit', month: 'short' }))
    : '');

  const totalTareas = filas.reduce((suma, fila) => suma + fila.hechas.length, 0);

  const cuerpo = filas.length === 0
    ? `<p class="vacio">${escapar(textos.vacio)}</p>`
    : filas.map(({ miembro, hechas, enProgreso }) => `
      <section class="persona">
        <div class="persona-cab">
          <div>
            <span class="nombre">${escapar(miembro.nombre)}</span>
            ${miembro.area ? `<span class="area">${escapar(textos.areas?.[miembro.area] || miembro.area)}</span>` : ''}
          </div>
          <div class="conteo">
            ${escapar(plantilla('conteoHechas').replace('{count}', hechas.length))}${
              enProgreso.length
                ? ` · ${escapar(plantilla('conteoEnCurso').replace('{count}', enProgreso.length))}`
                : ''
            }
          </div>
        </div>

        <div class="bloque-titulo">${escapar(textos.tituloHechas)}</div>
        <table>${hechas.map((tarea) => filaTarea(tarea, hora(tarea.completadoEn))).join('')}</table>

        ${enProgreso.length ? `
          <div class="bloque-titulo">${escapar(textos.tituloEnCurso)}</div>
          <table>${enProgreso.map((tarea) => filaTarea(tarea, vence(tarea.venceEn), 'curso')).join('')}</table>
        ` : ''}
      </section>`).join('');

  return `<!doctype html>
<html lang="${escapar(locale.slice(0, 2))}">
<head>
  <meta charset="utf-8" />
  <title>${escapar(textos.titulo)} · ${escapar(textos.fechaLegible)}</title>
  <style>${ESTILOS}</style>
</head>
<body>
  <header class="cabecera">
    <h1>${escapar(textos.titulo)}</h1>
    <p class="fecha">${escapar(textos.fechaLegible)}</p>
    ${textos.filtroProyecto ? `<p class="filtro">${escapar(textos.filtroProyecto)}</p>` : ''}
  </header>

  ${cuerpo}

  <footer class="pie">
    <span>${escapar(plantilla('pie')
      .replace('{personas}', filas.length)
      .replace('{tareas}', totalTareas))}</span>
    <span>${escapar(textos.generado)}</span>
  </footer>
</body>
</html>`;
};

/** Manda el reporte al diálogo de impresión del navegador ("Guardar como PDF"). */
export const imprimirReporteDia = (opciones) => {
  const html = construirHtmlReporte(opciones);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';

  iframe.onload = () => {
    const ventana = iframe.contentWindow;
    if (!ventana) return;
    ventana.focus();
    ventana.print();
    // El diálogo de impresión es modal, pero algunos navegadores devuelven el
    // control antes de terminar de renderizar: se espera un poco para no
    // arrancar el iframe a media impresión.
    window.setTimeout(() => iframe.remove(), 1500);
  };

  iframe.srcdoc = html;
  document.body.appendChild(iframe);
};

export default imprimirReporteDia;
