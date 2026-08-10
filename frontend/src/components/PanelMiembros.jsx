// Equipo de cada proyecto, agrupado y desplegable.
//
// Era la pagina "Comunidad", con su propia entrada en el menu. El usuario pidio
// moverla dentro de Proyectos como una pestaña mas y dejarla **solo para el
// admin**, que es quien reparte trabajo entre proyectos. Quien decide que se ve
// es ProyectosPage; aqui solo se dibuja.

import { useState } from 'react';
import useSWR from 'swr';
import { proyectosService } from '../services/api';
import { PageSkeleton } from './Skeleton';
import UserAvatar from './UserAvatar';
import { usePreferences } from '../context/PreferencesContext';
import { getEstadoProyecto } from '../utils/estadosProyecto';
import { 
  Code2, 
  BarChart3, 
  Megaphone, 
  User, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList, 
  Zap, 
  CheckCircle2,
  Mail
} from 'lucide-react';

const AREA_CONF = {
  DESARROLLO:     { labelKey: 'areaDesarrollo',    color: '#818cf8', bg: 'rgba(129,140,248,0.08)',  icon: <Code2 size={16} /> },
  ADMINISTRACION: { labelKey: 'areaAdministracion', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   icon: <BarChart3 size={16} /> },
  COMUNICACION:   { labelKey: 'areaComunicacion',   color: '#10b981', bg: 'rgba(16,185,129,0.08)',  icon: <Mail size={16} /> },
  MARKETING:      { labelKey: 'areaMarketing',      color: '#db2777', bg: 'rgba(219,39,119,0.08)',  icon: <Megaphone size={16} /> },
};

// 10 por pagina: con 29 proyectos, abrirlos todos era una pared de tarjetas.
const PROYECTOS_POR_PAGINA = 10;

const ROL_CONF = {
  ADMIN:   { labelKey: 'roleAdmin',   color: '#818cf8', bg: 'rgba(129,140,248,0.08)' },
  MIEMBRO: { labelKey: 'roleMember',  color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
};

// Los colores salen del catalogo compartido (utils/estadosProyecto)
const getColorEstado = (estado) => getEstadoProyecto(estado).color;

// —— Tarjeta de miembro —————————————————————————————————————————————————————
const MiembroCard = ({ miembro }) => {
  const { t } = usePreferences();
  const areaConf = AREA_CONF[miembro.area] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: <User size={16} />, labelKey: 'areaGeneral' };
  const rolConf  = ROL_CONF[miembro.rol] || ROL_CONF.MIEMBRO;
  const pct      = miembro.tareas.total > 0
    ? Math.round((miembro.tareas.hechas / miembro.tareas.total) * 100)
    : 0;

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '1.5rem',
      padding: '1.5rem',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}
    onMouseOver={e => { 
      e.currentTarget.style.transform = 'translateY(-4px)'; 
      e.currentTarget.style.boxShadow = 'var(--shadow-xl)'; 
      e.currentTarget.style.borderColor = 'var(--color-primary-20)'; 
    }}
    onMouseOut={e => { 
      e.currentTarget.style.transform = 'translateY(0)'; 
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)'; 
      e.currentTarget.style.borderColor = 'var(--color-border)'; 
    }}
    >
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <UserAvatar
          usuario={miembro}
          size={48}
          radius={14}
          color={areaConf.color}
          background={areaConf.bg}
          borderColor={`${areaConf.color}30`}
          fontSize="1.15rem"
          shadow={`0 8px 16px ${areaConf.color}15`}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '1.1rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em' }}>
            {miembro.nombre}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
            {miembro.email}
          </div>
        </div>
      </div>

      {/* Badges área + rol */}
      <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{
          padding: '0.25rem 0.75rem', borderRadius: '999px',
          fontSize: '0.8rem', fontWeight: 500,
          background: areaConf.bg, color: areaConf.color,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          border: `1px solid ${areaConf.color}20`
        }}>
          {areaConf.icon}
          <span style={{ position: 'relative', top: '0.5px' }}>{t(areaConf.labelKey)}</span>
        </span>
        <span style={{
          padding: '0.25rem 0.75rem', borderRadius: '999px',
          fontSize: '0.8rem', fontWeight: 500,
          background: rolConf.bg, color: rolConf.color,
          border: `1px solid ${rolConf.color}20`,
          display: 'flex', alignItems: 'center'
        }}>
          <span style={{ position: 'relative', top: '0.5px' }}>{t(rolConf.labelKey)}</span>
        </span>
      </div>

      {/* Barra de progreso tareas */}
      {miembro.tareas.total > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.4rem', fontWeight: 500, textTransform: '' }}>
            <span>{miembro.tareas.hechas}/{miembro.tareas.total} {t('teamTasksPlural')}</span>
            <span style={{ color: pct === 100 ? '#34d399' : areaConf.color }}>{pct}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--color-surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              width: `${pct}%`,
              background: pct === 100 ? '#34d399' : areaConf.color,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}><ClipboardList size={14} strokeWidth={2.5} /> {miembro.tareas.pendientes}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}><Zap size={14} strokeWidth={2.5} /> {miembro.tareas.enProgreso}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}><CheckCircle2 size={14} strokeWidth={2.5} /> {miembro.tareas.hechas}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// —— Sección de proyecto —————————————————————————————————————————————————————
const ProyectoEquipo = ({ proyecto }) => {
  const { t } = usePreferences();
  // Plegado de entrada: con veintitantos proyectos, abiertos era una pared.
  const [open, setOpen] = useState(false);
  const [equipoData, setEquipoData] = useState(null);
  const [cargandoEquipo, setCargandoEquipo] = useState(false);
  const estadoColor = getColorEstado(proyecto.estado);
  const areaConf    = AREA_CONF[proyecto.creador?.area] || AREA_CONF.DESARROLLO;
  // El conteo del encabezado sale de lo que ya trae el proyecto, para no tener
  // que pedir el equipo solo para poder mostrar un numero.
  const totalDelProyecto = equipoData?.length ?? proyecto.miembros?.length ?? 0;

  // El equipo se pide al abrir por primera vez, no al cargar el panel. Antes se
  // pedian los 29 de golpe y habia que esperarlos todos para ver algo.
  //
  // Se lanza desde el propio clic y no desde un efecto que observe `open`: asi
  // la peticion sale una sola vez, sin la cascada de renders que provoca poner
  // el estado de carga dentro de un efecto.
  const alternar = async () => {
    const abriendo = !open;
    setOpen(abriendo);
    if (!abriendo || equipoData !== null || cargandoEquipo) return;

    setCargandoEquipo(true);
    try {
      const data = await proyectosService.equipoDeProyecto(proyecto.id);
      setEquipoData(data.equipo || []);
    } catch {
      setEquipoData([]);
    } finally {
      setCargandoEquipo(false);
    }
  };

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: '1rem', overflow: 'hidden',
    }}>
      {/* Cabecera del proyecto — clickeable para colapsar */}
      <button
        onClick={alternar}
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
          <div style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
            {proyecto.nombre}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.15rem', fontWeight: 600 }}>
            {totalDelProyecto} {totalDelProyecto !== 1 ? t('teamMemberPlural') : t('teamMemberSingular')}
          </div>
        </div>
        <span style={{
          padding: '0.35rem 0.85rem', borderRadius: '12px',
          fontSize: '0.7rem', fontWeight: 500,
          background: areaConf.bg, color: areaConf.color, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '0.45rem',
          border: `1.2px solid ${areaConf.color}30`,
          textTransform: '',
          whiteSpace: 'nowrap'
        }}>
          {areaConf.icon && <span style={{ display: 'flex', opacity: 0.8 }}>{areaConf.icon}</span>}
          {t(areaConf.labelKey)}
        </span>
        <span style={{ color: 'var(--color-text-dim)', display: 'flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', flexShrink: 0 }}><ChevronDown size={18} strokeWidth={2.5} /></span>
      </button>

      {/* Equipo del proyecto */}
      {open && (
        <div style={{ padding: '1rem 1.25rem' }}>
          {cargandoEquipo || equipoData === null ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              {t('loading')}
            </div>
          ) : equipoData.length === 0 ? (
            <div style={{
              padding: '1.5rem', textAlign: 'center',
              border: '1px dashed var(--color-border)', borderRadius: '0.6rem',
              color: 'var(--color-text-muted)', fontSize: '0.8rem',
            }}>
              {t('teamNoMembers')}
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

// —— Panel ——————————————————————————————————————————————————————————————————
const PanelMiembros = () => {
  const { t } = usePreferences();
  const [pagina, setPagina] = useState(1);

  // Una sola peticion: la lista de proyectos. El equipo de cada uno lo pide su
  // propia seccion al desplegarse. Antes se pedian los 29 equipos de golpe y
  // no se pintaba nada hasta que llegaba el ultimo.
  const { data, isLoading, error } = useSWR(
    'panel-miembros-proyectos',
    async () => {
      const { proyectos } = await proyectosService.listar();
      return proyectos || [];
    },
  );

  const proyectos = data || [];
  const totalPaginas = Math.max(1, Math.ceil(proyectos.length / PROYECTOS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const proyectosDeLaPagina = proyectos.slice(
    (paginaActual - 1) * PROYECTOS_POR_PAGINA,
    paginaActual * PROYECTOS_POR_PAGINA,
  );

  // Suma de los contadores que ya trae cada proyecto, sin pedir nada mas
  const totalMiembros = proyectos.reduce((suma, p) => suma + (p.miembros?.length || 0), 0);

  if (isLoading && !data) {
    return <PageSkeleton cards={3} showSidebar={false} />;
  }

  return (
    <div>
      {/* El resumen se queda: dice de un vistazo cuanta gente hay repartida y
          en cuantos proyectos. El titulo lo pone la pestaña. */}
      <p className="mb-5 text-sm font-normal text-[var(--color-text-muted)]">
        {t('teamSummary', {
          members: totalMiembros,
          memberLabel: totalMiembros !== 1 ? t('teamMemberPlural') : t('teamMemberSingular'),
          projects: proyectos.length,
          projectLabel: proyectos.length !== 1 ? t('teamProjectPlural') : t('teamProjectSingular'),
        })}
      </p>

      {error ? (
        <div className="alert-error">{error.message}</div>
      ) : proyectos.length === 0 ? (
        <div style={{
          padding: '3rem', textAlign: 'center',
          background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)',
          borderRadius: '1rem', color: 'var(--color-text-muted)',
        }}>
          {t('teamNoProjects')}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {proyectosDeLaPagina.map((proyecto) => (
              <ProyectoEquipo key={proyecto.id} proyecto={proyecto} />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm font-normal text-[var(--color-text-muted)]">
                {t('timelineRange', {
                  desde: (paginaActual - 1) * PROYECTOS_POR_PAGINA + 1,
                  hasta: Math.min(paginaActual * PROYECTOS_POR_PAGINA, proyectos.length),
                  total: proyectos.length,
                })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((n) => Math.max(1, n - 1))}
                  disabled={paginaActual === 1}
                  aria-label={t('previous')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-[70px] text-center text-sm font-medium text-[var(--color-text)]">
                  {paginaActual} / {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))}
                  disabled={paginaActual === totalPaginas}
                  aria-label={t('next')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PanelMiembros;