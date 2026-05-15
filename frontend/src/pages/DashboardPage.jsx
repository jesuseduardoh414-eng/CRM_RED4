import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Clock,
  PlayCircle,
  CalendarDays,
  User,
  Megaphone,
} from 'lucide-react';

const AREA_CONF = {
  DESARROLLO: { label: 'Desarrollo', color: '#2563eb', bg: 'rgba(37,99,235,0.08)', icon: <Code2 size={18} /> },
  ADMINISTRACION: { label: 'Administración', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <BarChart3 size={18} /> },
  COMUNICACION: { label: 'Comunicación', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <Mail size={18} /> },
  MARKETING: { label: 'Marketing', color: '#db2777', bg: 'rgba(219,39,119,0.08)', icon: <Megaphone size={18} /> },
};

const IconProjects = () => <Layers size={20} strokeWidth={2.5} />;
const IconTasks = () => <ClipboardList size={20} strokeWidth={2.5} />;
const IconChart = () => <BarChart3 size={20} strokeWidth={2.5} />;
const IconTeam = () => <Users size={20} strokeWidth={2.5} />;
const IconCheck = () => <CheckCircle2 size={20} strokeWidth={2.5} />;

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const StatCard = ({ value, sub, icon, color, bg }) => (
  <div className="bg-white p-5 lg:p-6 rounded-[24px] shadow-sm border border-slate-50 flex items-center justify-between min-w-[140px] h-[110px] lg:h-[120px]">
    <div className="flex flex-col gap-0.5">
      <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none">
        {value}
      </div>
      {sub && <div className="text-[10px] lg:text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">{sub}</div>}
    </div>
    <div
      className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
      style={{ background: bg || `${color}10`, color }}
    >
      {icon}
    </div>
  </div>
);

const MiniTask = ({ tarea }) => (
  <div style={{ padding: '0.65rem 0', borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.25 }}>
      {tarea.titulo}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tarea.proyecto?.nombre || 'Sin proyecto'}</span>
      {tarea.venceEn && <span>{new Date(tarea.venceEn).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>}
    </div>
  </div>
);

const ActivityBucket = ({ label, count, icon, color, children }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.72rem', fontWeight: '900', color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {icon}
        {label}
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: '900', color }}>{count}</span>
    </div>
    <div style={{ minHeight: '48px' }}>{children}</div>
  </div>
);

const AdminMemberActivity = ({ miembros }) => {
  if (!miembros?.length) return null;

  return (
    <div className="card" style={{ padding: '2rem', marginBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '0.25rem' }}>Actividad del equipo</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Tareas hechas hoy, en curso y pendientes por vencimiento.</p>
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hoy / Semana</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {miembros.map((miembro) => (
          <div key={miembro.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                {miembro.nombre?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '900', color: '#0f172a' }}>{miembro.nombre}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800' }}>{miembro.area}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#16a34a', background: '#f0fdf4', padding: '0.25rem 0.45rem', borderRadius: '8px' }}>{miembro.totales.hechasHoy} hechas</span>
                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#2563eb', background: '#eff6ff', padding: '0.25rem 0.45rem', borderRadius: '8px' }}>{miembro.totales.enProgreso} curso</span>
                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#dc2626', background: '#fef2f2', padding: '0.25rem 0.45rem', borderRadius: '8px' }}>{miembro.totales.faltanHoy} hoy</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              <ActivityBucket label="Hechas hoy" count={miembro.totales.hechasHoy} color="#16a34a" icon={<CheckCircle2 size={15} />}>
                {miembro.hechasHoy.length ? miembro.hechasHoy.map((t) => <MiniTask key={t.id} tarea={t} />) : <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Sin completadas hoy</span>}
              </ActivityBucket>
              <ActivityBucket label="Haciendo" count={miembro.totales.enProgreso} color="#2563eb" icon={<PlayCircle size={15} />}>
                {miembro.enProgreso.length ? miembro.enProgreso.map((t) => <MiniTask key={t.id} tarea={t} />) : <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Sin tareas en curso</span>}
              </ActivityBucket>
              <ActivityBucket label="Faltan hoy" count={miembro.totales.faltanHoy} color="#dc2626" icon={<Clock size={15} />}>
                {miembro.faltanHoy.length ? miembro.faltanHoy.map((t) => <MiniTask key={t.id} tarea={t} />) : <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Sin pendientes de hoy</span>}
              </ActivityBucket>
              <ActivityBucket label="Faltan semana" count={miembro.totales.faltanSemana} color="#f59e0b" icon={<CalendarDays size={15} />}>
                {miembro.faltanSemana.length ? miembro.faltanSemana.map((t) => <MiniTask key={t.id} tarea={t} />) : <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Sin pendientes próximos</span>}
              </ActivityBucket>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardMiembro = ({ usuario }) => {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [todasTareas, setTodas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const area = AREA_CONF[usuario?.area] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: <User size={18} />, label: usuario?.area };

  useEffect(() => {
    const cargar = async () => {
      try {
        const dataProy = await proyectosService.listar();
        setProyectos(dataProy.proyectos);
        const tareasArr = await Promise.all(dataProy.proyectos.map((p) => tareasService.listar(p.id).then((d) => d.tareas)));
        setTodas(tareasArr.flat());
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  if (cargando) return <Spinner texto="Sincronizando tus datos..." />;

  const pendientes = todasTareas.filter((t) => t.estado === 'PENDIENTE');
  const enProgreso = todasTareas.filter((t) => t.estado === 'EN_PROGRESO');
  const hechas = todasTareas.filter((t) => t.estado === 'HECHO');
  const proximas = [...pendientes, ...enProgreso]
    .filter((t) => t.venceEn)
    .sort((a, b) => new Date(a.venceEn) - new Date(b.venceEn))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <div
          className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl shrink-0 flex items-center justify-center font-black text-lg lg:text-xl shadow-xl shadow-slate-200/50"
          style={{ background: area.bg, border: `2px solid ${area.color}`, color: area.color }}
        >
          {usuario?.nombre?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl lg:text-3xl font-black tracking-tight text-slate-900 leading-tight">
            {saludo()}, {usuario?.nombre?.split(' ')[0]}
          </h1>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
              {area.label}
            </span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-2 py-0.5 bg-blue-50 rounded-md border border-blue-100">
              Activo
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        <StatCard value={proyectos.length} icon={<IconProjects />} color="#2563eb" bg="#eff6ff" sub="PROYECTOS" />
        <StatCard value={pendientes.length} icon={<IconTasks />} color="#64748b" bg="#f8fafc" sub="PENDIENTES" />
        <StatCard value={enProgreso.length} icon={<IconTasks />} color="#8b5cf6" bg="#f5f3ff" sub="EN MARCHA" />
        <StatCard value={hechas.length} icon={<IconCheck />} color="#10b981" bg="#f0fdf4" sub="HECHAS" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Proyectos en los que participas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {proyectos.map((p) => (
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

        {proximas.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Próximas a vencer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {proximas.map((t) => (
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

const DashboardAdmin = () => {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    statsService.getAdminStats().then(setStats).catch(console.error).finally(() => setCargando(false));
  }, []);

  if (cargando) return <Spinner texto="Compilando datos globales..." />;
  if (!stats) return <div style={{ padding: '4rem', textAlign: 'center' }}>Error de conexión</div>;

  const { proyectos, tareas, topUsuarios, actividadReciente, proyectosProgreso, actividadMiembros } = stats;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">Control Central</h1>
          <p className="text-sm lg:text-base text-slate-500 mt-1">Supervisión estratégica del equipo CRM RED 4</p>
        </div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        <StatCard value={proyectos.total} icon={<IconProjects />} color="#2563eb" bg="#eff6ff" sub="PROYECTOS" />
        <StatCard value={tareas.estados.find((e) => e.estado === 'HECHO')?._count || 0} icon={<IconTasks />} color="#10b981" bg="#f0fdf4" sub="FINALIZADAS" />
        <StatCard value={topUsuarios.length} icon={<IconTeam />} color="#8b5cf6" bg="#f5f3ff" sub="EQUIPO" />
        <StatCard value={`${Math.round(((tareas.estados.find((e) => e.estado === 'HECHO')?._count || 0) / (tareas.total || 1)) * 100)}%`} icon={<IconChart />} color="#f59e0b" bg="#fffbeb" sub="EFICIENCIA" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '2rem' }}>Progreso de Proyectos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {proyectosProgreso.map((p) => (
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
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: idx === 0 ? '#fbbf24' : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: idx === 0 ? '#000' : '#fff' }}>{idx + 1}</div>
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

      <AdminMemberActivity miembros={actividadMiembros} />

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '2rem' }}>Flujo Reciente de Actividad</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {actividadReciente.map((log) => (
            <div key={log.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-primary-light)', marginBottom: '0.25rem' }}>{log.accion}</div>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{log.descripcion}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <User size={14} /> {log.usuario.nombre}
              </div>
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
