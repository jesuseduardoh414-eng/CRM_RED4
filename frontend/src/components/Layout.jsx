import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NotificationCenter from './NotificationCenter';
import { agendaService } from '../services/api';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  ShieldCheck, 
  LogOut, 
  Menu,
  Bell,
  Calendar
} from 'lucide-react';

// ── Íconos SVG (Material Style) ──────────────────────────────────────────────
// Los íconos ahora vienen de lucide-react
const IconDashboard = () => <LayoutDashboard size={20} strokeWidth={2.5} />;
const IconProyectos = () => <FolderKanban size={20} strokeWidth={2.5} />;
const IconEquipo     = () => <Users size={20} strokeWidth={2.5} />;
const IconGestion    = () => <ShieldCheck size={20} strokeWidth={2.5} />;
const IconLogout     = () => <LogOut size={18} strokeWidth={2.5} />;
const IconMenu       = () => <Menu size={24} strokeWidth={2.5} />;
const IconAgenda     = () => <Calendar size={20} strokeWidth={2.5} />;

const navLinks = [
  { to: '/dashboard', label: 'Inicio', Icon: IconDashboard },
  { to: '/proyectos',  label: 'Proyectos', Icon: IconProyectos },
  { to: '/agenda',     label: 'Mi Agenda', Icon: IconAgenda, badge: true },
  { to: '/equipo',     label: 'Comunidad', Icon: IconEquipo },
];

const SIDEBAR_W = 280;

const Layout = ({ children }) => {
  const { usuario, logout } = useAuth();
  const { showToast }       = useToast();
  const navigate            = useNavigate();
  const [open, setOpen]     = useState(false);
  const [isMobile, setMobile] = useState(window.innerWidth < 1024);
  const [recordatoriosCount, setRecordatoriosCount] = useState(0);

  // Sistema de Alertas de Agenda
  useEffect(() => {
    if (!usuario) return;

    const checarAgenda = async () => {
      try {
        const [{ recordatorios }, { pendientes }] = await Promise.all([
          agendaService.recordatorios(),
          agendaService.invitacionesPendientes()
        ]);
        
        setRecordatoriosCount(recordatorios.length + pendientes.length);

        // Notificar recordatorios próximos
        const yaNotificados = JSON.parse(localStorage.getItem('crm_recordatorios_vistos') || '[]');
        const ahora = new Date();

        recordatorios.forEach(r => {
          if (!yaNotificados.includes(r.id)) {
            const min = Math.round((new Date(r.fechaInicio) - ahora) / 60000);
            const msg = `Recordatorio: ${r.titulo} en ${min} minutos`;
            showToast(msg, 'info');
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("CRM - Recordatorio", { body: msg, icon: '/logo.png' });
            }
            yaNotificados.push(r.id);
          }
        });

        localStorage.setItem('crm_recordatorios_vistos', JSON.stringify(yaNotificados));
      } catch (error) {
        console.error('Error al checar agenda:', error);
      }
    };

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    checarAgenda();
    const interval = setInterval(checarAgenda, 60000);
    return () => clearInterval(interval);
  }, [usuario, showToast]);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = () => {
    logout();
    showToast('Sesión cerrada', 'info');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-surface)', position: 'relative' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        background: 'var(--color-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: isMobile ? (open ? 0 : -SIDEBAR_W) : 0,
        height: '100vh',
        zIndex: 100,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Logo Branding (Centered & Large) */}
        <div style={{ padding: '3rem 1.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <img 
            src="/logo.png" 
            alt="Red 4 Design" 
            style={{ 
              width: '100%', maxWidth: '200px', height: 'auto',
              objectFit: 'contain'
            }} 
          />
          <div style={{ 
            fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '800', 
            textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center' 
          }}>
            Sistema Interno
          </div>
        </div>

        {/* Navegación */}
        <nav style={{ flex: 1, padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', padding: '1rem 0.75rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Menú Principal</div>
          {navLinks.map(({ to, label, Icon, badge }) => (
            <NavLink
              key={to} to={to} onClick={() => isMobile && setOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.9rem 1.25rem', borderRadius: '12px',
                textDecoration: 'none', fontSize: '0.95rem',
                fontWeight: isActive ? '700' : '500',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'var(--transition-base)'
              })}
            >
              <Icon /> 
              <span style={{ flex: 1 }}>{label}</span>
              {badge && recordatoriosCount > 0 && (
                <span style={{
                  background: 'var(--color-error)', color: '#fff',
                  fontSize: '0.65rem', fontWeight: '900',
                  padding: '0.1rem 0.4rem', borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(239,68,68,0.3)'
                }}>
                  {recordatoriosCount}
                </span>
              )}
            </NavLink>
          ))}

          {usuario?.rol === 'ADMIN' && (
            <>
              <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.3)', padding: '2rem 0.75rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Administración</div>
              <NavLink
                to="/usuarios" onClick={() => isMobile && setOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.9rem 1.25rem', borderRadius: '12px',
                  textDecoration: 'none', fontSize: '0.95rem',
                  fontWeight: isActive ? '700' : '500',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  transition: 'var(--transition-base)'
                })}
              >
                <IconGestion /> Usuarios
              </NavLink>
            </>
          )}
        </nav>

        {/* User Profile Card (Figma Style) */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem'
          }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', color: '#fff',
              border: '2px solid rgba(255,255,255,0.1)'
            }}>
              {usuario?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario?.nombre}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>{usuario?.email?.split('@')[0]}</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
               <NotificationCenter />
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)', border: 'none',
              color: '#f87171', fontSize: '0.85rem', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            <IconLogout /> Salir
          </button>
        </div>
      </aside>

      {/* ── Content Area ───────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, position: 'relative', height: '100vh', overflowY: 'auto', background: 'var(--color-bg-base)' }}>
        {/* Top Header (Figma Style) */}
        <header style={{
          height: '70px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', padding: '0 2.5rem', gap: '2rem', position: 'sticky', top: 0, zIndex: 90
        }}>
          {isMobile && (
            <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer' }}>
              <IconMenu />
            </button>
          )}
          
          {/* Barra de Búsqueda */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '600px' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
            <input 
              type="text" placeholder="Buscar proyectos, tareas o miembros..."
              style={{
                width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px',
                background: 'var(--color-bg-base)', border: '1px solid var(--color-border)',
                fontSize: '0.9rem', outline: 'none', transition: 'var(--transition-base)'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginLeft: 'auto' }}>
            <div style={{ color: 'var(--color-text-dim)', cursor: 'pointer' }}><Bell size={20} /></div>
            <div style={{ color: 'var(--color-text-dim)', cursor: 'pointer' }}><Calendar size={20} /></div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }} />
          </div>
        </header>

        <div style={{ padding: isMobile ? '1.5rem' : '3rem', maxWidth: '1600px', margin: '0 auto' }}>
          {children}
        </div>
      </main>

      {/* Overlay Móvil */}
      {isMobile && open && (
        <div 
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 99 }} 
        />
      )}
    </div>
  );
};

export default Layout;
