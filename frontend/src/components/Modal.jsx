import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';

/**
 * Base comun para todas las ventanas emergentes del CRM.
 *
 * Resuelve de una sola vez:
 *  - El scroll queda DENTRO de la tarjeta (antes se desplazaba la tarjeta completa
 *    y la barra se salia por la esquina redondeada).
 *  - Encabezado y pie fijos: no se van con el scroll.
 *  - Cierra con Esc y haciendo clic fuera (lo trae Radix).
 *  - Bloquea el scroll del fondo y atrapa el foco mientras esta abierta.
 *
 * ⚠️ DOS DETALLES QUE NO HAY QUE CAMBIAR:
 *
 * 1. La tarjeta se centra con `inset-0 + m-auto`, NO con `translate`.
 *    Un `transform` en la tarjeta la convertiria en el contenedor de referencia
 *    de sus hijos `position: fixed` (el selector de hora de ModalEvento, el
 *    calendario de RangeDatePicker), y el `overflow-hidden` los recortaria.
 *
 * 2. Las animaciones son solo de opacidad (`fade`), sin `zoom` ni `slide`,
 *    por la misma razon: esas usan `transform`.
 */
const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  subHeader,      // fila fija bajo el titulo (p. ej. pestañas)
  headerExtra,
  footer,
  maxWidth = '760px',
  bodyClassName = '',
  children,
}) => {
  const { t } = usePreferences();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(abierto) => { if (!abierto) onClose?.(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[1400] bg-slate-900/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />

        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={{ maxWidth }}
          className="fixed inset-0 z-[1401] m-auto flex h-fit max-h-[90vh] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[1.75rem] bg-[var(--color-surface)] shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        >
          {/* Encabezado fijo */}
          <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-start justify-between gap-4 px-6 py-5 lg:px-8">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-xl font-black tracking-tight text-[var(--color-text)] lg:text-2xl">
                  {title}
                </DialogPrimitive.Title>
                {subtitle && (
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {headerExtra}
                <DialogPrimitive.Close
                  aria-label={t('close')}
                  title={t('close')}
                  className="rounded-xl p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
                >
                  <X size={22} />
                </DialogPrimitive.Close>
              </div>
            </div>

            {subHeader}
          </div>

          {/* Cuerpo: lo unico que se desplaza */}
          <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8 ${bodyClassName}`}>
            {children}
          </div>

          {/* Pie fijo (opcional) */}
          {footer && (
            <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-3)] px-6 py-4 lg:px-8">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default Modal;
