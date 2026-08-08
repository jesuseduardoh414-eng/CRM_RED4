import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';

/**
 * Selector de varias opciones que se despliega al pulsarlo.
 *
 * Sustituye a las rejillas de botones donde todas las opciones estaban a la
 * vista: con cuatro areas y una docena de personas, el formulario se iba a tres
 * pantallas de alto. Aqui solo se ve el resumen de lo elegido.
 *
 * El panel se posiciona en `absolute` en vez de usar el Popover de Radix: este
 * componente vive dentro de la ventana modal, que es un Dialog de Radix, y un
 * portal hermano se queda sin recibir clics. El selector de fecha de esta misma
 * pantalla ya resolvia asi lo mismo.
 */
const SelectorMultiple = ({
  opciones,
  seleccionados,
  onToggle,
  placeholder,
  conBuscador = false,
  disabled = false,
  vacioTexto,
}) => {
  const { t } = usePreferences();
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
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

  const elegidas = opciones.filter((o) => seleccionados.includes(o.valor));

  // Como mucho dos nombres y un contador: con mas, el boton crece tanto como la
  // rejilla que vino a sustituir.
  const resumen = elegidas.length === 0
    ? placeholder
    : elegidas.length <= 2
      ? elegidas.map((o) => o.etiqueta).join(', ')
      : `${elegidas[0].etiqueta}, ${elegidas[1].etiqueta} +${elegidas.length - 2}`;

  const termino = busqueda.trim().toLowerCase();
  const visibles = opciones.filter((o) => !termino || String(o.etiqueta).toLowerCase().includes(termino));

  // Se conserva el orden en que llegaron los grupos, no el alfabetico
  const grupos = [];
  visibles.forEach((o) => {
    const clave = o.grupo || '';
    if (!grupos.some((g) => g.clave === clave)) grupos.push({ clave, opciones: [] });
    grupos.find((g) => g.clave === clave).opciones.push(o);
  });

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm outline-none transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`truncate ${elegidas.length ? 'font-medium text-[var(--color-text)]' : 'font-normal text-[var(--color-text-muted)]'}`}>
          {resumen}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {elegidas.length > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
              {elegidas.length}
            </span>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 z-[1200] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          {conBuscador && (
            <div className="relative border-b border-slate-100">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={15} />
              </span>
              <input
                type="search"
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('search')}
                aria-label={t('search')}
                className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm font-normal text-[var(--color-text)] outline-none placeholder:text-slate-400"
              />
            </div>
          )}

          <div className="max-h-[240px] overflow-y-auto p-1">
            {visibles.length === 0 && (
              <p className="px-3 py-6 text-center text-sm font-normal text-[var(--color-text-muted)]">
                {vacioTexto || t('searchNoResults')}
              </p>
            )}

            {grupos.map((grupo) => (
              <div key={grupo.clave}>
                {grupo.clave && (
                  <p className="px-3 pb-1 pt-2 text-xs font-normal text-slate-400">{grupo.clave}</p>
                )}
                {grupo.opciones.map((opcion) => {
                  const elegida = seleccionados.includes(opcion.valor);
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      disabled={opcion.deshabilitada}
                      title={opcion.titulo}
                      onClick={() => onToggle(opcion.valor)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${elegida ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${elegida ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                        {elegida && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-normal text-[var(--color-text)]">
                        {opcion.etiqueta}
                      </span>
                      {/* Aviso corto a la derecha, p. ej. que ya esta en otro proyecto */}
                      {opcion.aviso && (
                        <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">
                          {opcion.aviso}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectorMultiple;
