import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, SlidersHorizontal, X } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import SelectorRangoFechas from './SelectorRangoFechas';
import CampoFiltro from './CampoFiltro';

/** Date -> 'YYYY-MM-DD' al mediodia, para no cruzar husos. */
const aClave = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const aFecha = (clave) => {
  if (!clave) return null;
  const [anio, mes, dia] = clave.split('-').map(Number);
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
};

/**
 * Los tres filtros de tareas detras de un solo boton.
 *
 * Antes vivian en un contenedor fijo que ocupaba una franja completa de la
 * pantalla aunque no se estuvieran usando. El boton lleva un contador con
 * cuantos filtros hay puestos, para que no se olvide uno activo.
 *
 * El calendario va dentro del panel, no en una ventana aparte: abrir una
 * ventana modal para elegir una fecha de filtro era demasiado.
 */
const FiltrosTareas = ({
  fecha,
  onFechaChange,
  prioridad,
  onPrioridadChange,
  prioridades,
  responsable,
  onResponsableChange,
  responsables,
}) => {
  const { t, language } = usePreferences();
  const [abierto, setAbierto] = useState(false);
  // El calendario arranca plegado, salvo que ya haya una fecha filtrando
  const [fechaAbierta, setFechaAbierta] = useState(Boolean(fecha?.from || fecha?.to));
  const contenedor = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsarFuera = (evento) => {
      if (contenedor.current && !contenedor.current.contains(evento.target)) setAbierto(false);
    };
    const alPulsarEscape = (evento) => { if (evento.key === 'Escape') setAbierto(false); };

    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alPulsarEscape);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alPulsarEscape);
    };
  }, [abierto]);

  const activos = [
    Boolean(fecha?.from || fecha?.to),
    prioridad !== 'todas',
    responsable !== 'todos',
  ].filter(Boolean).length;

  const limpiar = () => {
    onFechaChange({ from: null, to: null });
    onPrioridadChange('todas');
    onResponsableChange('todos');
  };

  const formatoCorto = { day: '2-digit', month: 'short' };
  const resumenFecha = fecha?.from
    ? fecha.to
      ? `${fecha.from.toLocaleDateString(language, formatoCorto)} – ${fecha.to.toLocaleDateString(language, formatoCorto)}`
      : fecha.from.toLocaleDateString(language, formatoCorto)
    : t('projectAnyDate');

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
          activos > 0
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
        }`}
      >
        <SlidersHorizontal size={16} />
        {t('projectTaskFilters')}
        {activos > 0 && (
          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">{activos}</span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-[1200] mt-2 w-[300px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--color-text)]">{t('projectTaskFilters')}</span>
            {activos > 0 && (
              <button
                type="button"
                onClick={limpiar}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
              >
                <X size={13} /> {t('clear')}
              </button>
            )}
          </div>

          {/* Los dos desplegables van primero por ser los de uso diario. La
              fecha queda al final y plegada: el calendario mide mas que los
              otros dos filtros juntos y dejaba el panel larguisimo. */}
          <div className="space-y-3">
            <CampoFiltro label={t('projectPriority')}>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-3 py-2.5 text-sm font-normal text-[var(--color-text)] outline-none transition-all focus:border-blue-500"
                value={prioridad}
                onChange={(e) => onPrioridadChange(e.target.value)}
              >
                <option value="todas">{t('projectAllPriorities')}</option>
                {prioridades.map((p) => (
                  <option key={p.value} value={p.value}>{t(p.labelKey)}</option>
                ))}
              </select>
            </CampoFiltro>

            <CampoFiltro label={t('projectResponsible')}>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-3)] px-3 py-2.5 text-sm font-normal text-[var(--color-text)] outline-none transition-all focus:border-blue-500"
                value={responsable}
                onChange={(e) => onResponsableChange(e.target.value)}
              >
                <option value="todos">{t('projectAllResponsibles')}</option>
                <option value="sin_asignar">{t('projectUnassigned')}</option>
                {responsables.map((r) => (
                  <option key={r.id} value={String(r.id)}>{r.nombre}</option>
                ))}
              </select>
            </CampoFiltro>

            {/* El calendario no crece dentro del panel sino que sale a su
                izquierda, apoyado en el borde de abajo. Desplegandolo hacia
                abajo el panel se salia de la pantalla, porque el boton de
                filtros vive en la parte alta de la pagina. */}
            <div className="relative border-t border-[var(--color-border)] pt-3">
              <button
                type="button"
                onClick={() => setFechaAbierta((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left"
              >
                <span className="text-sm font-medium text-[var(--color-text-dim)]">{t('projectDate')}</span>
                <span className="flex items-center gap-1.5 text-sm font-normal text-[var(--color-text-muted)]">
                  {resumenFecha}
                  <ChevronLeft size={15} className={`transition-transform ${fechaAbierta ? '-rotate-180' : ''}`} />
                </span>
              </button>

              {fechaAbierta && (
                <div className="absolute bottom-0 right-full mr-3 w-[340px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl">
                  <SelectorRangoFechas
                    sinMarco
                    conLeyenda={false}
                    desde={aClave(fecha?.from)}
                    hasta={aClave(fecha?.to)}
                    onChange={({ desde, hasta }) => onFechaChange({ from: aFecha(desde), to: aFecha(hasta) })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltrosTareas;
