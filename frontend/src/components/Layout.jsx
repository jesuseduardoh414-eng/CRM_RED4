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
  Calendar,
  Search
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
  { to: '/agenda',     label: 'Mi Agenda', Icon: IconAgenda },
  { to: '/equipo',     label: 'Comunidad', Icon: IconEquipo },
];

const Layout = ({ children }) => {
  const { usuario, logout } = useAuth();
  const { showToast }       = useToast();
  const navigate            = useNavigate();
  const [open, setOpen]     = useState(false);
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

        // Notificar recordatorios prÃ³ximos
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

  // Cerrar sidebar al cambiar de ruta en mÃ³vil
  useEffect(() => {
    setOpen(false);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    showToast('SesiÃ³n cerrada', 'info');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)] relative overflow-hidden">

      {/* â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside 
        className={`
          fixed lg:sticky top-0 h-screen z-[100] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          bg-[var(--color-sidebar)] flex flex-col w-[280px]
          ${open ? 'left-0' : '-left-[280px] lg:left-0'}
        `}
      >
        {/* Logo Branding */}
        <div className="p-8 lg:p-12 pb-8 flex flex-col items-center gap-4">
          <img 
            src="/logo.png" 
            alt="Red 4 Design" 
            className="w-full max-w-[180px] lg:max-w-[200px] h-auto object-contain"
          />
          <div className="text-[10px] lg:text-xs text-white/40 font-black uppercase tracking-[0.15em] text-center">
            Panel Interno
          </div>
        </div>

        {/* NavegaciÃ³n */}
        <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] font-black text-white/30 px-3 py-4 uppercase tracking-widest">MenÃº Principal</div>
          {navLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-bold transition-all
                ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}
              `}
            >
              <Icon /> 
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}

          {usuario?.rol === 'ADMIN' && (
            <>
              <div className="text-[10px] font-black text-white/30 px-3 py-4 mt-4 uppercase tracking-widest">AdministraciÃ³n</div>
              <NavLink
                to="/usuarios" onClick={() => setOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-bold transition-all
                  ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}
                `}
              >
                <IconGestion /> Usuarios
              </NavLink>
            </>
          )}
        </nav>

        {/* User Profile Card */}
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-black text-white border-2 border-white/10">
              {usuario?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{usuario?.nombre}</div>
              <div className="text-[11px] text-white/40 font-medium truncate">{usuario?.email?.split('@')[0]}</div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full p-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <IconLogout /> Salir
          </button>
        </div>
      </aside>

      {/* â”€â”€ Content Area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="flex-1 min-w-0 flex flex-col h-screen bg-[var(--color-bg-base)]">
        {/* Top Header */}
        <header className="h-16 lg:h-[70px] bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-4 lg:px-10 gap-4 lg:gap-8 sticky top-0 z-[90]">
          <button 
            onClick={() => setOpen(true)} 
            className="lg:hidden p-2 -ml-2 text-[var(--color-text)] hover:bg-slate-100 rounded-xl transition-colors"
          >
            <IconMenu />
          </button>
          
          {/* Barra de BÃºsqueda */}
          <div className="relative flex-1 max-w-xl group">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-50 transition-opacity">
              <Search size={18} />
            </span>
            <input 
              type="text" 
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2.5 lg:py-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] text-xs lg:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <span className="hidden lg:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">âŒ˜K</span>
          </div>

          <div className="flex items-center gap-2 lg:gap-5 ml-auto">
            <NotificationCenter />
            <div className="hidden lg:block w-8 h-8 rounded-full bg-[var(--color-surface-3)] border border-[var(--color-border)] shadow-sm" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-12 max-w-[1600px] w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Overlay MÃ³vil */}
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
