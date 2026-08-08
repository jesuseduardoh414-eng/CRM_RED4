import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import NotificationCenter from './NotificationCenter';
import UserAvatar from './UserAvatar';
import { agendaService } from '../services/api';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  SunMedium,
  Users,
} from 'lucide-react';

const IconDashboard = () => <LayoutDashboard size={20} strokeWidth={2.5} />;
const IconProyectos = () => <FolderKanban size={20} strokeWidth={2.5} />;
const IconEquipo = () => <Users size={20} strokeWidth={2.5} />;
const IconGestion = () => <ShieldCheck size={20} strokeWidth={2.5} />;
const IconLogout = () => <LogOut size={18} strokeWidth={2.5} />;
const IconMenu = () => <Menu size={24} strokeWidth={2.5} />;
const IconAgenda = () => <Calendar size={20} strokeWidth={2.5} />;

const navLinks = [
  { to: '/dashboard', labelKey: 'home', Icon: IconDashboard },
  { to: '/proyectos', labelKey: 'projects', Icon: IconProyectos },
  { to: '/agenda', labelKey: 'agenda', Icon: IconAgenda },
  { to: '/equipo', labelKey: 'community', Icon: IconEquipo },
];

const Layout = ({ children }) => {
  const { usuario, logout } = useAuth();
  const { theme, setTheme, t } = usePreferences();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('crm_sidebar_collapsed') === 'true');
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [, setRecordatoriosCount] = useState(0);
  const contenidoRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Al cambiar de pagina, volver al inicio del contenido. El scroll no lo lleva
  // window sino el contenedor del <main>, por eso no basta con window.scrollTo.
  useEffect(() => {
    contenidoRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    if (!usuario) return;

    const checarAgenda = async () => {
      try {
        const [{ recordatorios }, { pendientes }] = await Promise.all([
          agendaService.recordatorios(),
          agendaService.invitacionesPendientes(),
        ]);

        setRecordatoriosCount(recordatorios.length + pendientes.length);

        const yaNotificados = JSON.parse(localStorage.getItem('crm_recordatorios_vistos') || '[]');
        const ahora = new Date();

        recordatorios.forEach((recordatorio) => {
          if (!yaNotificados.includes(recordatorio.id)) {
            const min = Math.round((new Date(recordatorio.fechaInicio) - ahora) / 60000);
            const msg = `Recordatorio: ${recordatorio.titulo} en ${min} minutos`;
            showToast(msg, 'info');

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('CRM - Recordatorio', { body: msg, icon: '/logo.png' });
            }

            yaNotificados.push(recordatorio.id);
          }
        });

        localStorage.setItem('crm_recordatorios_vistos', JSON.stringify(yaNotificados));
      } catch (error) {
        console.error('Error al checar agenda:', error);
      }
    };

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checarAgenda();
    const interval = setInterval(checarAgenda, 60000);
    return () => clearInterval(interval);
  }, [usuario, showToast]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('crm_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const toggleSidebar = () => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setCollapsed((prev) => !prev);
      });
      return;
    }

    setCollapsed((prev) => !prev);
  };

  const handleLogout = () => {
    logout();
    showToast('Sesion cerrada', 'info');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)] relative overflow-hidden">
      <aside
        className="
          fixed lg:sticky top-0 h-screen z-[100] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          bg-[var(--color-sidebar)] flex flex-col
        "
        style={{
          left: isDesktop ? 0 : (open ? 0 : 'calc(-1 * min(84vw, 320px))'),
          width: isDesktop
            ? (collapsed ? '92px' : 'clamp(240px, 18vw, 280px)')
            : 'min(84vw, 320px)',
          minWidth: isDesktop
            ? (collapsed ? '92px' : 'clamp(240px, 18vw, 280px)')
            : 'min(84vw, 320px)',
          maxWidth: isDesktop
            ? (collapsed ? '92px' : '280px')
            : '320px',
        }}
      >
        {/* Poco aire arriba a proposito: el usuario prefiere que el logo y el
            menu suban para ganar alto util en la lista de secciones. */}
        <div className={`relative flex w-full flex-col items-center ${collapsed ? 'gap-4 px-3 pt-4 pb-4' : 'gap-3 px-4 pt-4 pb-4'}`}>
          <img
            src={collapsed ? '/logo - sideber.png' : '/logo.png'}
            alt="Red 4 Design"
            className={`h-auto object-contain transition-all duration-300 ${collapsed ? 'w-12 max-w-[48px]' : 'w-full max-w-[180px] lg:max-w-[200px]'}`}
            style={{ viewTransitionName: 'sidebar-logo' }}
          />

          {!collapsed && (
            <div className="text-[10px] lg:text-xs text-white/40 font-medium text-center whitespace-nowrap">
              {t('internalPanel')}
            </div>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            className={`
              hidden lg:flex items-center ${collapsed ? 'justify-center w-full px-5' : 'gap-4 w-full px-5'}
              py-3.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
              text-white/50 hover:text-white hover:bg-white/5
            `}
            title={collapsed ? 'Expandir menu' : undefined}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
          >
            <span className="shrink-0 flex items-center justify-center">
              {collapsed ? <ChevronRight size={20} strokeWidth={2.5} /> : <ChevronLeft size={20} strokeWidth={2.5} />}
            </span>
            {!collapsed && <span className="flex-1 min-w-0 truncate text-left">{t('collapse')}</span>}
          </button>

          {/* Buscador. Vivia en la barra superior; aqui cabe completo y libera
              esos 70px de alto en todas las pantallas. Colapsado se reduce a la
              lupa, que expande el menu para poder escribir. */}
          {collapsed ? (
            <button
              type="button"
            onClick={toggleSidebar}
              title={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="hidden lg:flex w-full items-center justify-center py-3 rounded-xl text-white/50 transition-all hover:text-white hover:bg-white/5"
            >
              <Search size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <div className="relative w-full group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-white/60">
                <Search size={17} />
            </span>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
                className="w-full rounded-xl bg-white/5 py-2.5 pl-10 pr-14 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:bg-white/10"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/40">
              Ctrl+K
            </span>
            </div>
          )}
        </div>

        <nav className={`flex-1 flex flex-col gap-1 overflow-y-auto ${collapsed ? 'px-3' : 'px-4'}`}>
          {!collapsed && (
            <div className="text-[10px] font-medium text-white/30 px-3 py-4 whitespace-nowrap">
              {t('mainMenu')}
            </div>
          )}

          {navLinks.map(({ to, labelKey, Icon }) => {
            const label = t(labelKey);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                title={collapsed ? label : undefined}
                className={({ isActive }) => `
                  flex items-center ${collapsed ? 'justify-center' : 'gap-4'} px-5 py-3.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                  ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}
                `}
              >
                <span className="shrink-0 flex items-center justify-center"><Icon /></span>
                {!collapsed && <span className="flex-1 min-w-0 truncate">{label}</span>}
              </NavLink>
            );
          })}

          {usuario?.rol === 'ADMIN' && (
            <>
              {!collapsed && (
                <div className="text-[10px] font-medium text-white/30 px-3 py-4 mt-4 whitespace-nowrap">
                  {t('administration')}
                </div>
              )}

              <NavLink
                to="/usuarios"
                onClick={() => setOpen(false)}
                title={collapsed ? t('users') : undefined}
                className={({ isActive }) => `
                  flex items-center ${collapsed ? 'justify-center' : 'gap-4'} px-5 py-3.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                  ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}
                `}
              >
                <span className="shrink-0 flex items-center justify-center"><IconGestion /></span>
                {!collapsed && <span className="min-w-0 truncate">{t('users')}</span>}
              </NavLink>
            </>
          )}

          {/* Notificaciones y tema van al final del menu, no en el pie fijo: en
              el pie robaban alto y obligaban a desplazar para llegar a Inicio o
              Proyectos, que es lo que de verdad se usa. */}
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-1">
            {isDesktop && <NotificationCenter enSidebar colapsado={collapsed} />}
            <button
              type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={collapsed ? (theme === 'dark' ? t('lightMode') : t('darkMode')) : undefined}
                aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
              className={`
                flex items-center ${collapsed ? 'justify-center' : 'gap-4'} w-full px-5 py-3.5 rounded-xl
                text-sm font-medium transition-all whitespace-nowrap
              text-white/50 hover:text-white hover:bg-white/5
              `}
            >
            <span className="shrink-0 flex items-center justify-center">
                {theme === 'dark' ? <SunMedium size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
            </span>
              {!collapsed && (
                <span className="flex-1 min-w-0 truncate text-left">
                  {theme === 'dark' ? t('lightMode') : t('darkMode')}
            </span>
              )}
            </button>
          </div>
        </nav>

        <div className={`border-t border-white/5 ${collapsed ? 'p-3' : 'p-6'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center mb-3' : 'gap-3 mb-5'}`}>
            <button
              type="button"
              onClick={() => navigate('/perfil')}
              className="rounded-full transition-all hover:scale-105"
              title={collapsed ? usuario?.nombre : undefined}
            >
              <UserAvatar
                usuario={usuario}
                size={40}
                radius={999}
                fontSize="0.85rem"
                color="#ffffff"
                background="rgba(255,255,255,0.12)"
                borderColor="rgba(255,255,255,0.16)"
              />
            </button>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{usuario?.nombre}</div>
                <div className="text-[11px] text-white/40 font-medium truncate">
                  {usuario?.email?.split('@')[0]}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={collapsed ? t('logout') : undefined}
            className={`w-full p-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all flex items-center justify-center whitespace-nowrap ${collapsed ? '' : 'gap-2'}`}
          >
            <span className="shrink-0 flex items-center justify-center"><IconLogout /></span>
            {!collapsed && <span className="truncate">{t('logout')}</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen bg-[var(--color-bg-base)] overflow-hidden">
        {/* Solo en movil: ahi la barra lateral esta oculta tras el boton de
            menu, asi que hace falta un sitio para abrirla y ver los avisos.
            En escritorio ya no hay barra superior; todo vive en el sidebar. */}
        <header className="lg:hidden h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-4 gap-4 sticky top-0 z-[90]">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 text-[var(--color-text)] hover:bg-[var(--color-surface-3)] rounded-xl transition-colors"
            aria-label={t('openMenu')}
          >
            <IconMenu />
          </button>

          {!isDesktop && <NotificationCenter />}
        </header>

        <div ref={contenidoRef} className="flex-1 overflow-y-auto p-4 lg:p-8 xl:p-12 max-w-[1600px] w-full mx-auto">
          {children}
        </div>
      </main>

      <div
        className={`
          fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99] transition-opacity duration-300
          ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setOpen(false)}
      />
    </div>
  );
};

export default Layout;
