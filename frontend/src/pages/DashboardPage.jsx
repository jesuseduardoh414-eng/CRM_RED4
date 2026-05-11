// Dashboard — adaptado según el rol del usuario
// ADMIN: vista global (estadísticas generales del equipo)
// MIEMBRO: vista personal (solo sus proyectos y tareas)

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { proyectosService, tareasService, statsService } from '../services/api';
import Spinner from '../components/Spinner';

// ─── Colores por área ────────────────────────────────────────────────────────
const AREA_CONF = {
  DESARROLLO:     { label: 'Desarrollo',     color: '#818cf8', bg: 'rgba(129,140,248,0.08)', icon: '💻' },
  ADMINISTRACION: { label: 'Administración', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: '📊' },
  COMUNICACION:   { label: 'Comunicación',   color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: '📢' },
};

const ESTADO_COLOR = {
  ACTIVO:   '#34d399',
  EN_PAUSA: '#f59e0b',
  CERRADO:  '#94a3b8',
};

const PRIORIDAD_CONF = {
  ALTA:  { color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  MEDIA: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)'  },
  BAJA:  { color: '#34d399', bg: 'rgba(52,211,153,0.08)'  },
};

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

// ─── Tarjeta stat ─────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, color }) => (
  <div style={{
    background:   'var(--color-surface-2)',
    border:       '1px solid var(--color-border)',
    borderRadius: '1rem', padding: '1.25rem 1.5rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  }}>
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: '800', color: color || 'var(--color-text)' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
    <div style={{ fontSize: '1.75rem', opacity: 0.6 }}>{icon}</div>
  </div>
);

// ─── Dashboard MIEMBRO ────────────────────────────────────────────────────────
const DashboardMiembro = ({ usuario }) => {
  const navigate              = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [todasTareas, setTodas] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const areaConf = AREA_CONF[usuario?.area] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: '👤', label: usuario?.area };

  useEffect(() => {
    const cargar = async () => {
      try {
        const dataProy = await proyectosService.listar();
        const proysFiltrados = dataProy.proyectos;
        setProyectos(proysFiltrados);

        // Cargar tareas de cada proyecto para este miembro
        const tareasArr = await Promise.all(
          proysFiltrados.map(p => tareasService.listar(p.id).then(d => d.tareas))
        );
        setTodas(tareasArr.flat());
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  if (cargando) return <Spinner texto="Cargando tu dashboard..." />;

  const pendientes  = todasTareas.filter(t => t.estado === 'PENDIENTE');
  const enProgreso  = todasTareas.filter(t => t.estado === 'EN_PROGRESO');
  const hechas      = todasTareas.filter(t => t.estado === 'HECHO');
  const proximas    = [...pendientes, ...enProgreso]
    .filter(t => t.venceEn)
    .sort((a, b) => new Date(a.venceEn) - new Date(b.venceEn))
    .slice(0, 5);

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Saludo personalizado con área */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
          background: areaConf.bg, border: `2px solid ${areaConf.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '800', fontSize: '1.25rem', color: areaConf.color,
        }}>
          {usuario?.nombre?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.15rem' }}>
            {saludo()}, {usuario?.nombre?.split(' ')[0]} 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--color-text-muted)' }}>
            <span style={{
              padding: '0.2rem 0.75rem', borderRadius: '999px',
              background: areaConf.bg, color: areaConf.color, fontWeight: '700',
            }}>{areaConf.icon} {areaConf.label}</span>
            <span style={{
              padding: '0.2rem 0.75rem', borderRadius: '999px',
              background: 'rgba(148,163,184,0.12)', color: '#94a3b8', fontWeight: '600',
            }}>Miembro</span>
          </div>
        </div>
      </div>

      {/* Stats de MIS tareas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <StatCard label="Mis proyectos"    value={proyectos.length}  icon="📁" color="#818cf8" sub={`${proyectos.filter(p => p.estado === 'ACTIVO').length} activo(s)`} />
        <StatCard label="Por hacer"        value={pendientes.length}  icon="📋" color="#94a3b8" />
        <StatCard label="En progreso"      value={enProgreso.length}  icon="⚡" color="#818cf8" />
        <StatCard label="Completadas"      value={hechas.length}      icon="✅" color="#34d399" />
      </div>

      {/* Mis proyectos */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.85rem' }}>Mis proyectos</h2>
        {proyectos.length === 0 ? (
          <div style={{
            padding: '2rem', textAlign: 'center',
            background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)',
            borderRadius: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.875rem',
          }}>
            Aún no tienes tareas asignadas en ningún proyecto.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}>
            {proyectos.map(p => {
              const pConf   = AREA_CONF[p.creador?.area] || AREA_CONF.DESARROLLO;
              const estadoC = ESTADO_COLOR[p.estado] || '#94a3b8';
              return (
                <div key={p.id}
                  onClick={() => navigate(`/proyectos/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.85rem 1rem', borderRadius: '0.75rem', cursor: 'pointer',
                    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = pConf.color + '66'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--color-border)';  e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: estadoC, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nombre}
                    </div>
                    <div style={{ fontSize: '1.05rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                      {p._count?.tareas ?? 0} tareas totales
                    </div>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.65rem', borderRadius: '999px', flexShrink: 0,
                    fontSize: '0.68rem', fontWeight: '700',
                    background: pConf.bg, color: pConf.color,
                  }}>{pConf.label}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>→</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Próximas tareas */}
      {proximas.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.85rem' }}>⏰ Próximas a vencer</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {proximas.map(t => {
              const prioConf = PRIORIDAD_CONF[t.prioridad] || PRIORIDAD_CONF.MEDIA;
              const fecha    = new Date(t.venceEn);
              const hoy      = new Date(); hoy.setHours(0,0,0,0); fecha.setHours(0,0,0,0);
              const diff     = Math.floor((fecha - hoy) / 86400000);
              const urgente  = diff <= 0;
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.9rem', borderRadius: '0.6rem',
                  background: urgente ? 'rgba(248,113,113,0.07)' : 'var(--color-surface-2)',
                  border: `1px solid ${urgente ? 'rgba(248,113,113,0.25)' : 'var(--color-border)'}`,
                }}>
                  <span style={{
                    padding: '0.15rem 0.5rem', borderRadius: '999px',
                    background: prioConf.bg, color: prioConf.color,
                    fontSize: '0.65rem', fontWeight: '700', flexShrink: 0,
                  }}>{t.prioridad}</span>
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.titulo}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', flexShrink: 0, fontWeight: '600',
                    color: urgente ? '#f87171' : diff === 0 ? '#fb923c' : 'var(--color-text-muted)',
                  }}>
                    {diff < 0 ? `Venció hace ${Math.abs(diff)}d` : diff === 0 ? '¡Hoy!' : `En ${diff}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Dashboard ADMIN ──────────────────────────────────────────────────────────
const DashboardAdmin = ({ usuario }) => {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    statsService.getAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <Spinner texto="Generando reporte global..." />;
  if (!stats) return <div style={{ padding: '2rem', textAlign: 'center' }}>Error al cargar estadísticas</div>;

  const { proyectos, tareas, topUsuarios, actividadReciente, proyectosProgreso } = stats;

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
            Panel de Control Administrativo
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Supervisión global de productividad y proyectos
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>

      {/* Stats Cards Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <StatCard label="Proyectos Totales" value={proyectos.total} icon="📂" color="var(--color-primary)" />
        <StatCard 
          label="Tareas en Curso" 
          value={tareas.estados.find(e => e.estado === 'EN_PROGRESO')?._count || 0} 
          sub={`${tareas.total} tareas en total`}
          icon="⚡" 
          color="#f59e0b" 
        />
        <StatCard 
          label="Tasa de Finalización" 
          value={`${Math.round(((tareas.estados.find(e => e.estado === 'HECHO')?._count || 0) / (tareas.total || 1)) * 100)}%`} 
          icon="✅" 
          color="#10b981" 
        />
        <StatCard label="Miembros Activos" value={topUsuarios.length} icon="👥" color="#818cf8" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        
        {/* Progreso de Proyectos */}
        <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Progreso de Proyectos Activos</h2>
            <Link to="/proyectos" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}>Ver todos</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {proyectosProgreso.map(p => (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: '700' }}>{p.nombre}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{p.porcentaje}% ({p.completas}/{p.total})</span>
                </div>
                <div style={{ height: '8px', background: 'var(--color-surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${p.porcentaje}%`, height: '100%', 
                    background: p.porcentaje === 100 ? '#10b981' : 'var(--color-primary)', 
                    transition: 'width 1s ease-in-out' 
                  }} />
                </div>
              </div>
            ))}
            {proyectosProgreso.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No hay proyectos activos</p>}
          </div>
        </div>

        {/* Top Productividad */}
        <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem' }}>Ranking de Productividad (Tareas Hechas)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topUsuarios.map((u, idx) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--color-surface-3)', borderRadius: '0.75rem' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', background: idx === 0 ? '#fbbf24' : 'var(--color-border)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: idx === 0 ? '#000' : 'inherit'
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{u.nombre}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{u.area}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-primary)' }}>{u._count.tareasAsignadas}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Logradas</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actividad Reciente Global */}
      <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem' }}>Flujo de Actividad Reciente</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {actividadReciente.map(log => (
            <div key={log.id} style={{ 
              padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)',
              background: 'rgba(255,255,255,0.01)', fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: '800', color: 'var(--color-primary)', fontSize: '0.75rem' }}>{log.accion.replace('_', ' ')}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{new Date(log.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p style={{ margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>{log.descripcion}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                👤 {log.usuario.nombre}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const DashboardPage = () => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMIN';

  return esAdmin
    ? <DashboardAdmin usuario={usuario} />
    : <DashboardMiembro usuario={usuario} />;
};

export default DashboardPage;
