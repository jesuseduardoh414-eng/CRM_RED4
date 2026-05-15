import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Calendar as CalendarIcon, X } from 'lucide-react';

/**
 * Componente de Selección de Rango de Fechas (Premium)
 * @param {Object} props
 * @param {Date} props.from - Fecha inicio
 * @param {Date} props.to - Fecha fin
 * @param {Function} props.onChange - Callback (range) => void
 */
const RangeDatePicker = ({ from, to, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const range = { from, to };

  const handleSelect = (newRange) => {
    onChange(newRange);
    // No cerramos automáticamente para que el usuario vea la selección
  };

  const displayText = from && to 
    ? `${format(from, "dd MMM", { locale: es })} - ${format(to, "dd MMM", { locale: es })}`
    : from
      ? `${format(from, "dd MMM", { locale: es })} - ...`
      : "Seleccionar rango";

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem',
          fontWeight: '700',
          color: 'var(--color-text)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'left',
          zIndex: 10
        }}
        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary-40)'}
        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
      >
        <CalendarIcon size={18} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
        <span style={{ flex: 1 }}>{displayText}</span>
      </button>

      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
          />
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.5rem)', // Abrimos hacia ARRIBA para que no se oculte en el modal
            left: 0,
            zIndex: 9999,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '1.25rem',
            boxShadow: 'var(--shadow-2xl)',
            padding: '1rem',
            animation: 'fadeSlideIn 0.2s ease',
            minWidth: '320px'
          }}>
            <style>{`
              .rdp { --rdp-accent-color: var(--color-primary); --rdp-background-color: var(--color-primary-10); margin: 0; }
              .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: var(--color-primary); color: white; }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: var(--color-surface-3); }
            `}</style>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              locale={es}
              numberOfMonths={1}
            />
            
            {/* Presets Rápidos */}
            <div style={{ 
              marginTop: '1rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid var(--color-border-light)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem'
            }}>
              {[
                { label: "Hoy", val: 0 },
                { label: "Mañana", val: 1 },
                { label: "3 días", val: 3 },
                { label: "1 semana", val: 7 },
                { label: "2 semanas", val: 14 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => {
                    const from = addDays(new Date(), p.val);
                    const to = from; // Por defecto mismo día si es preset simple
                    onChange({ from, to });
                  }}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    color: 'var(--color-text-dim)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'var(--color-primary-10)';
                    e.currentTarget.style.borderColor = 'var(--color-primary-40)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'var(--color-surface-2)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-text-dim)';
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--color-border-light)', paddingTop: '0.75rem' }}>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem', fontWeight: '900', color: 'white', border: 'none', background: 'var(--color-primary)', borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase' }}
              >Aceptar</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RangeDatePicker;
