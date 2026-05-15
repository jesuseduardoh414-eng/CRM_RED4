import { useState, useEffect, useRef } from 'react';
import { notificacionesService } from '../services/api';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const NotificationCenter = () => {
  const { usuario } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notificaciones.filter(n => !n.leida).length;

  const fetchNotificaciones = async () => {
    try {
      const data = await notificacionesService.listar();
      if (data?.notificaciones) {
        setNotificaciones(data.notificaciones);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  };

  useEffect(() => {
    if (!usuario) return;

    fetchNotificaciones();
    
    // SISTEMA DE RESPALDO: Polling cada 15 segundos por si Realtime falla
    const interval = setInterval(() => {
      fetchNotificaciones();
    }, 15000);

    // Solo configurar Realtime si Supabase está inicializado
    const realtimeEnabled = import.meta.env.VITE_ENABLE_REALTIME === 'true';
    if (!supabase || !realtimeEnabled) return () => clearInterval(interval);

    const channel = supabase
      .channel('public:notificaciones')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        (payload) => {
          console.log('🔔 [Realtime] ¡Mensaje recibido!', payload);
          if (payload.new) {
            const targetId = payload.new.usuario_id || payload.new.usuarioId;
            if (targetId == usuario.id) {
              console.log('✅ [Realtime] Alerta para mí!');
              fetchNotificaciones(); // Refrescar lista completa para estar seguros
              if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 [Realtime] Estado: ${status}`);
        if (err && status !== 'CHANNEL_ERROR') console.error('[Realtime] Error:', err);
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [usuario]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarcarLeida = async (id) => {
    try {
      await notificacionesService.marcarLeida(id);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarcarTodas = async () => {
    try {
      await notificacionesService.marcarTodasLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Botón Bell */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? 'var(--color-surface-3)' : 'var(--color-bg-base)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          width: '42px', height: '42px',
          borderRadius: '12px',
          position: 'relative',
          fontSize: '1.2rem',
          color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: open ? 'inset 0 2px 4px rgba(0,0,0,0.05)' : 'var(--shadow-sm)',
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = 'var(--color-surface-3)';
          e.currentTarget.style.borderColor = 'var(--color-primary)';
        }}
        onMouseOut={e => {
          if (!open) {
            e.currentTarget.style.background = 'var(--color-bg-base)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }
        }}
      >
        <Bell size={20} fill={unreadCount > 0 ? "currentColor" : "none"} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: 'var(--color-error)', color: '#fff',
            fontSize: '0.7rem', fontWeight: '900',
            width: '20px', height: '20px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--color-surface)',
            boxShadow: '0 2px 8px rgba(255, 255, 255, 0.2)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown - Abre hacia ARRIBA porque está al fondo del sidebar */}
      {open && (
        <div style={{
          position: 'absolute', top: '120%', right: '0',
          width: '320px', background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)', borderRadius: '1.25rem',
          boxShadow: '0 15px 50px rgba(0,0,0,0.5)',
          zIndex: 1000, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{
            padding: '1rem', borderBottom: '1px solid var(--color-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarcarTodas}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-primary)',
                  fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.25rem'
                }}
              >
                <CheckCheck size={14} /> Marcar todas
              </button>
            )}
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notificaciones.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                No tienes notificaciones
              </div>
            ) : (
              notificaciones.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.leida && handleMarcarLeida(n.id)}
                  style={{
                    padding: '0.9rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: n.leida ? 'default' : 'pointer',
                    background: n.leida ? 'transparent' : 'rgba(255,255,255,0.05)',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                >
                  {!n.leida && (
                    <div style={{
                      position: 'absolute', left: '0.4rem', top: '50%', transform: 'translateY(-50%)',
                      width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)'
                    }} />
                  )}
                  <div style={{
                    fontSize: '0.88rem', fontWeight: n.leida ? '500' : '700',
                    color: n.leida ? 'var(--color-text-muted)' : 'var(--color-text)',
                    lineHeight: 1.4, marginBottom: '0.2rem'
                  }}>
                    {n.mensaje}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {new Date(n.creadaEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

