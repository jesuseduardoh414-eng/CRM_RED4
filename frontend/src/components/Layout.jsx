// Layout principal — sidebar + área de contenido
// Responsivo desde 768px: sidebar colapsable con hamburger

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NotificationCenter from './NotificationCenter';

// ── Íconos SVG ───────────────────────────────────────────────────────────────
const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconProyectos = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconEquipo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconGestion = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <circle cx="12" cy="11" r="3"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const AREA_COLORS = {
  DESARROLLO:     '#818cf8',
  ADMINISTRACION: '#fbbf24',
  COMUNICACION:   '#34d399',
};

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/proyectos',  label: 'Proyectos',  Icon: IconProyectos },
  { to: '/equipo',     label: 'Mi Equipo',  Icon: IconEquipo },
];

const SIDEBAR_W = 240;

const Layout = ({ children }) => {
  const { usuario, logout } = useAuth();
  const { showToast }       = useToast();
  const navigate            = useNavigate();
  const [open, setOpen]     = useState(false); // sidebar en móvil
  const [isMobile, setMobile] = useState(window.innerWidth < 768);

  // Detectar cambio de tamaño
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cerrar sidebar al navegar en móvil
  const handleNav = () => { if (isMobile) setOpen(false); };

  const handleLogout = () => {
    logout();
    showToast('Sesión cerrada correctamente', 'info');
    navigate('/login');
  };

  const areaColor = AREA_COLORS[usuario?.area] || '#94a3b8';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-surface)', position: 'relative' }}>

      {/* ── Overlay móvil ───────────────────────────────────────────── */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={{
        width:        SIDEBAR_W,
        flexShrink:   0,
        background:   'var(--color-surface-2)',
        borderRight:  '1px solid var(--color-border)',
        display:      'flex',
        flexDirection:'column',
        position:     isMobile ? 'fixed' : 'sticky',
        top:          0,
        left:         isMobile ? (open ? 0 : -SIDEBAR_W) : 0,
        height:       '100vh',
        zIndex:       50,
        transition:   'left 0.25s ease',
      }}>
        {/* Logo + botón cerrar en móvil */}
        <div style={{
          padding:      '1.25rem 1rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          display:      'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '34px', height: '34px',
              background: 'var(--color-primary)', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0,
            }}>🏢</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', lineHeight: 1.2 }}>CRM Interno</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>Gestión de proyectos</div>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', color: 'var(--color-text-muted)',
              cursor: 'pointer', padding: '0.25rem',
            }}><IconClose /></button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '0.85rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {navLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to} to={to} onClick={handleNav}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.6rem 0.85rem', borderRadius: '0.5rem',
                textDecoration: 'none', fontSize: '1.05rem',
                fontWeight: isActive ? '700' : '500',
                color:      isActive ? '#fff' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-primary)' : 'transparent',
                transition: 'all 0.15s',
              })}
              onMouseOver={e => { if (!e.currentTarget.getAttribute('aria-current')) { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text)'; } }}
              onMouseOut={e  => { if (!e.currentTarget.getAttribute('aria-current')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}
            >
              <Icon />{label}
            </NavLink>
          ))}

          {usuario?.rol === 'ADMIN' && (
            <NavLink
              to="/usuarios" onClick={handleNav}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.6rem 0.85rem', borderRadius: '0.5rem',
                textDecoration: 'none', fontSize: '1.05rem',
                fontWeight: isActive ? '700' : '500',
                color:      isActive ? '#fff' : 'var(--color-text-muted)',
                background: isActive ? '#f59e0b' : 'transparent', // Color naranja para gestión
                transition: 'all 0.15s',
              })}
              onMouseOver={e => { if (!e.currentTarget.getAttribute('aria-current')) { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; e.currentTarget.style.color = '#f59e0b'; } }}
              onMouseOut={e  => { if (!e.currentTarget.getAttribute('aria-current')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}
            >
              <IconGestion /> Gestión de Equipo
            </NavLink>
          )}
        </nav>
        
        {/* Notificaciones */}
        <div style={{ padding: '0.5rem 1.15rem', display: 'flex', justifyContent: 'flex-start' }}>
          <NotificationCenter />
        </div>

        {/* Usuario + Logout */}
        <div style={{ padding: '0.85rem 0.65rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: '700', flexShrink: 0,
            }}>
              {usuario?.nombre?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {usuario?.nombre}
              </div>
              <div style={{ fontSize: '0.68rem', color: areaColor, fontWeight: '500' }}>
                {usuario?.area} · {usuario?.rol}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              width: '100%', padding: '0.5rem 0.75rem',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '0.4rem', color: 'var(--color-error)',
              fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
            onMouseOut={e  => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
          >
            <IconLogout /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar móvil */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'var(--color-surface-2)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <button
              onClick={() => setOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer' }}
            ><IconMenu /></button>
            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>CRM Interno</span>
          </div>
        )}

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
