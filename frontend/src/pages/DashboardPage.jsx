// Dashboard — adaptado según el rol del usuario
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { proyectosService, tareasService, statsService } from '../services/api';
import Spinner from '../components/Spinner';
import { 
  Layers, 
  CheckCircle2, 
  Users, 
  BarChart3, 
  Code2, 
  Mail, 
  ArrowRight,
  ClipboardList,
  AlertCircle
} from 'lucide-react';

// ─── Configuración Visual ────────────────────────────────────────────────────
const AREA_CONF = {
  DESARROLLO:     { label: 'Desarrollo',     color: '#2563eb', bg: 'rgba(37,99,235,0.08)', icon: <Code2 size={18} /> },
  ADMINISTRACION: { label: 'Administración', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: <BarChart3 size={18} /> },
  COMUNICACION:   { label: 'Comunicación',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <Mail size={18} /> },
};

// Los íconos ahora vienen de lucide-react
const IconProjects = () => <Layers size={20} strokeWidth={2.5} />;
const IconTasks    = () => <ClipboardList size={20} strokeWidth={2.5} />;
const IconChart    = () => <BarChart3 size={20} strokeWidth={2.5} />;
const IconTeam     = () => <Users size={20} strokeWidth={2.5} />;
const IconCheck    = () => <CheckCircle2 size={20} strokeWidth={2.5} />;

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

// ─── Tarjeta stat (Premium) ──────────────────────────────────────────────────
const StatCard = ({ value, sub, icon, color, bg }) => (
  <div className="card" style={{ 
    padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    border: 'none', borderRadius: '24px', background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
    minHeight: '140px'
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ fontSize: '2.75rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.05em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>{sub}</div>}
    </div>
    <div style={{ 
      width: '64px', height: '64px', borderRadius: '20px', background: bg || `${color}10`, 
      color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      {icon}
    </div>
  </div>
);

// ─── Dashboard MIEMBRO ────────────────────────────────────────────────────────
const DashboardMiembro = ({ usuario }) => {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [todasTareas, setTodas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const area = AREA_CONF[usuario?.area] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '👤', label: usuario?.area };

  useEffect(() => {
    const cargar = async () => {
      try {
        const dataProy = await proyectosService.listar();
        setProyectos(dataProy.proyectos);
        const tareasArr = await Promise.all(dataProy.proyectos.map(p => tareasService.listar(p.id).then(d => d.tareas)));
        setTodas(tareasArr.flat());
      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    };
    cargar();
  }, []);

  if (cargando) return <Spinner texto="Sincronizando tus datos..." />;

  const pendientes = todasTareas.filter(t => t.estado === 'PENDIENTE');
  const enProgreso = todasTareas.filter(t => t.estado === 'EN_PROGRESO');
  const hechas = todasTareas.filter(t => t.estado === 'HECHO');
  const proximas = [...pendientes, ...enProgreso]
    .filter(t => t.venceEn)
    .sort((a, b) => new Date(a.venceEn) - new Date(b.venceEn))
    .slice(0, 5);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Saludo y Branding Personal */}
      <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px', flexShrink: 0,
          background: area.bg, border: `2px solid ${area.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '900', fontSize: '1.5rem', color: area.color,
          boxShadow: `0 8px 24px ${area.color}22`
        }}>
          {usuario?.nombre?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {saludo()}, {usuario?.nombre?.split(' ')[0]}
          </h1>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: area.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{area.icon} {area.label}</span>
            <span style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem' }}>●</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MIEMBRO ACTIVO</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        <StatCard value={proyectos.length} icon={<IconProjects />} color="#2563eb" bg="#eff6ff" sub="mis proyectos" />
        <StatCard value={pendientes.length} icon={<IconTasks />} color="#64748b" bg="#f8fafc" sub="pendientes" />
        <StatCard value={enProgreso.length} icon={<IconTasks />} color="#8b5cf6" bg="#f5f3ff" sub="en progreso" />
        <StatCard value={hechas.length} icon={<IconCheck />} color="#10b981" bg="#f0fdf4" sub="finalizadas" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
        {/* Mis Proyectos List */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Proyectos en los que participas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {proyectos.map(p => (
              <div key={p.id} onClick={() => navigate(`/proyectos/${p.id}`)} className="card" style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{p.nombre}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{p._count?.tareas || 0} tareas asignadas</div>
                </div>
                <span style={{ color: 'var(--color-primary)', display: 'flex' }}><ArrowRight size={20} /></span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas Tareas */}
        {proximas.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Próximas a vencer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {proximas.map(t => (
                <div key={t.id} style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t.titulo}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={10} /> {new Date(t.venceEn).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{t.prioridad}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Dashboard ADMIN ──────────────────────────────────────────────────────────
const DashboardAdmin = () => {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    statsService.getAdminStats().then(setStats).catch(console.error).finally(() => setCargando(false));
  }, []);

  if (cargando) return <Spinner texto="Compilando datos globales..." />;
  if (!stats) return <div style={{ padding: '4rem', textAlign: 'center' }}>Error de conexión</div>;

  const { proyectos, tareas, topUsuarios, actividadReciente, proyectosProgreso } = stats;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.75rem', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: 1 }}>Control Central</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Supervisión estratégica del equipo CRM RED 4</p>
        </div>
        <div style={{ textAlign: 'right', color: 'var(--color-primary-light)', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.85rem' }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        <StatCard value={proyectos.total} icon={<IconProjects />} color="#2563eb" bg="#eff6ff" sub={`de ${proyectos.total} totales`} />
        <StatCard value={tareas.estados.find(e => e.estado === 'HECHO')?._count || 0} icon={<IconTasks />} color="#10b981" bg="#f0fdf4" sub={`de ${tareas.total} totales`} />
        <StatCard value={topUsuarios.length} icon={<IconTeam />} color="#8b5cf6" bg="#f5f3ff" sub="usuarios activos" />
        <StatCard value={`${Math.round(((tareas.estados.find(e => e.estado === 'HECHO')?._count || 0) / (tareas.total || 1)) * 100)}%`} icon={<IconChart />} color="#f59e0b" bg="#fffbeb" sub="todos los proyectos" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '2rem' }}>Progreso de Proyectos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {proyectosProgreso.map(p => (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem', fontWeight: '700' }}>
                  <span>{p.nombre}</span>
                  <span style={{ color: 'var(--color-primary-light)' }}>{p.porcentaje}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--color-surface-3)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${p.porcentaje}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '2rem' }}>Top Productividad</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topUsuarios.map((u, idx) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-surface-3)', borderRadius: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: idx === 0 ? '#fbbf24' : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: idx === 0 ? '#000' : '#fff' }}>{idx+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{u.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.area}</div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: '900', color: 'var(--color-primary-light)', fontSize: '1.25rem' }}>{u._count.tareasAsignadas}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '2rem' }}>Flujo Reciente de Actividad</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {actividadReciente.map(log => (
            <div key={log.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-primary-light)', marginBottom: '0.25rem' }}>{log.accion}</div>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{log.descripcion}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>👤 {log.usuario.nombre}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { usuario } = useAuth();
  return usuario?.rol === 'ADMIN' ? <DashboardAdmin /> : <DashboardMiembro usuario={usuario} />;
};

export default DashboardPage;
