// PÃ¡gina Mi Equipo â€” vista por proyecto
// ADMIN: ve el equipo de cada proyecto (todos los proyectos)
// MIEMBRO: ve el equipo de sus proyectos asignados

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { proyectosService } from '../services/api';
import Spinner from '../components/Spinner';
import { 
  Code2, 
  BarChart3, 
  Megaphone, 
  User, 
  ClipboardList, 
  Zap, 
  CheckCircle2 
} from 'lucide-react';

const AREA_CONF = {
  DESARROLLO:     { label: 'Desarrollo',     color: '#818cf8', bg: 'rgba(129,140,248,0.08)',  icon: <Code2 size={16} /> },
  ADMINISTRACION: { label: 'AdministraciÃ³n', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   icon: <BarChart3 size={16} /> },
  COMUNICACION:   { label: 'ComunicaciÃ³n',   color: '#10b981', bg: 'rgba(16,185,129,0.08)',  icon: <Megaphone size={16} /> },
};

const ROL_CONF = {
  ADMIN:   { label: 'Admin',   color: '#818cf8', bg: 'rgba(129,140,248,0.08)' },
  MIEMBRO: { label: 'Miembro', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
};

const ESTADO_COLOR = {
  ACTIVO:   '#34d399',
  EN_PAUSA: '#f59e0b',
  CERRADO:  '#94a3b8',
};

// â”€â”€ Tarjeta de miembro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MiembroCard = ({ miembro }) => {
  const areaConf = AREA_CONF[miembro.area] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: <User size={16} />, label: miembro.area };
  const rolConf  = ROL_CONF[miembro.rol] || ROL_CONF.MIEMBRO;
  const pct      = miembro.tareas.total > 0
    ? Math.round((miembro.tareas.hechas / miembro.tareas.total) * 100)
    : 0;

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: `1px solid var(--color-border)`,
      borderRadius: '0.75rem',
      padding: '0.9rem 1rem',
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: areaConf.bg, border: `1.5px solid ${areaConf.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '800', fontSize: '0.875rem', color: areaConf.color,
        }}>
          {miembro.nombre.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {miembro.nombre}
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {miembro.email}
          </div>
        </div>
      </div>

      {/* Badges Ã¡rea + rol */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
        <span style={{
          padding: '0.2rem 0.65rem', borderRadius: '999px',
          fontSize: '0.85rem', fontWeight: '700',
          background: areaConf.bg, color: areaConf.color,
        }}>{areaConf.icon} {areaConf.label}</span>
        <span style={{
          padding: '0.2rem 0.65rem', borderRadius: '999px',
          fontSize: '0.85rem', fontWeight: '700',
          background: rolConf.bg, color: rolConf.color,
        }}>{rolConf.label}</span>
      </div>

      {/* Barra de progreso tareas */}
      {miembro.tareas.total > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
            <span>{miembro.tareas.hechas}/{miembro.tareas.total} tareas</span>
            <span style={{ fontWeight: '700', color: pct === 100 ? '#34d399' : areaConf.color }}>{pct}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--color-surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              width: `${pct}%`,
              background: pct === 100 ? '#34d399' : areaConf.color,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><ClipboardList size={12} /> {miembro.tareas.pendientes}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Zap size={12} /> {miembro.tareas.enProgreso}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} /> {miembro.tareas.hechas}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// â”€â”€ SecciÃ³n de proyecto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ProyectoEquipo = ({ proyecto, equipoData }) => {
  const [open, setOpen] = useState(true);
  const estadoColor = ESTADO_COLOR[proyecto.estado] || '#94a3b8';
  const areaConf    = AREA_CONF[proyecto.creador?.area] || AREA_CONF.DESARROLLO;

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: '1rem', overflow: 'hidden',
    }}>
      {/* Cabecera del proyecto â€” clickeable para colapsar */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
          textAlign: 'left',
        }}
      >
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: estadoColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {proyecto.nombre}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
            {equipoData.length} miembro{equipoData.length !== 1 ? 's' : ''} asignados
          </div>
        </div>
        <span style={{
          padding: '0.15rem 0.65rem', borderRadius: '999px',
          fontSize: '0.68rem', fontWeight: '700',
          background: areaConf.bg, color: areaConf.color, flexShrink: 0,
        }}>{areaConf.label}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>â–¾</span>
      </button>

      {/* Equipo del proyecto */}
      {open && (
        <div style={{ padding: '1rem 1.25rem' }}>
          {equipoData.length === 0 ? (
            <div style={{
              padding: '1.5rem', textAlign: 'center',
              border: '1px dashed var(--color-border)', borderRadius: '0.6rem',
              color: 'var(--color-text-muted)', fontSize: '0.8rem',
            }}>
              Sin miembros asignados en este proyecto
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}>
              {equipoData.map(m => <MiembroCard key={m.id} miembro={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// â”€â”€ PÃ¡gina principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EquipoPage = () => {
  const { usuario }               = useAuth();
  const [datos, setDatos]         = useState([]); // [{ proyecto, equipo }]
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');
  const esAdmin = usuario?.rol === 'ADMIN';

  useEffect(() => {
    const cargar = async () => {
      try {
        const { proyectos } = await proyectosService.listar();
        // Para cada proyecto cargar su equipo
        const resultados = await Promise.all(
          proyectos.map(async (p) => {
            const data = await proyectosService.equipoDeProyecto(p.id);
            return { proyecto: p, equipo: data.equipo };
          })
        );
        setDatos(resultados);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const totalMiembros = new Set(datos.flatMap(d => d.equipo.map(m => m.id))).size;

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.25rem' }}>Mi Equipo</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.15rem' }}>
          {esAdmin
            ? `${totalMiembros} miembro${totalMiembros !== 1 ? 's' : ''} activos en ${datos.length} proyecto${datos.length !== 1 ? 's' : ''}`
            : `Equipo de tus ${datos.length} proyecto${datos.length !== 1 ? 's' : ''} asignados`
          }
        </p>
      </div>

      {cargando ? (
        <Spinner texto="Cargando equipo..." />
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : datos.length === 0 ? (
        <div style={{
          padding: '3rem', textAlign: 'center',
          background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)',
          borderRadius: '1rem', color: 'var(--color-text-muted)',
        }}>
          No tienes proyectos asignados aÃºn.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {datos.map(({ proyecto, equipo }) => (
            <ProyectoEquipo key={proyecto.id} proyecto={proyecto} equipoData={equipo} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EquipoPage;
