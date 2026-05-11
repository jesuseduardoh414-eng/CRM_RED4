// Sistema de Toasts globales
// Provee: showToast({ message, type }) desde cualquier componente

import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const TIPOS = {
  success: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', icon: '✅' },
  error:   { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', icon: '❌' },
  info:    { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)', icon: 'ℹ️' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Contenedor fijo de toasts */}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        zIndex: 999, display: 'flex', flexDirection: 'column',
        gap: '0.5rem', maxWidth: '360px',
      }}>
        {toasts.map(toast => {
          const conf = TIPOS[toast.type] || TIPOS.info;
          return (
            <div
              key={toast.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: conf.bg,
                border: `1px solid ${conf.border}`,
                borderRadius: '0.75rem',
                color: conf.color,
                fontSize: '0.875rem', fontWeight: '500',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                animation: 'toastIn 0.25s ease',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{conf.icon}</span>
              <span style={{ flex: 1, color: '#f1f5f9' }}>{toast.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8',
                  cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0,
                }}
              >✕</button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px) scale(0.95); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
};
