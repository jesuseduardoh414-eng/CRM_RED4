import { useMemo, useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import Tooltip2 from './Tooltip';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Layers3,
  Sparkles,
  User,
} from 'lucide-react';

const AREA_COLORS = {
  DESARROLLO: { solid: '#2563eb', soft: 'rgba(37,99,235,0.14)' },
  ADMINISTRACION: { solid: '#f59e0b', soft: 'rgba(245,158,11,0.16)' },
  COMUNICACION: { solid: '#db2777', soft: 'rgba(219,39,119,0.14)' },
  MARKETING: { solid: '#8b5cf6', soft: 'rgba(139,92,246,0.14)' },
  DEFAULT: { solid: '#64748b', soft: 'rgba(100,116,139,0.14)' },
};

const STATUS_CONF = {
  PENDIENTE: {
    labelKey: 'statusTodo',
    solid: '#94a3b8',
    soft: 'rgba(148,163,184,0.18)',
    glow: 'rgba(148,163,184,0.24)',
    icon: <Clock3 size={12} />,
  },
  EN_PROGRESO: {
    labelKey: 'statusInProgress',
    solid: '#2563eb',
    soft: 'rgba(37,99,235,0.16)',
    glow: 'rgba(37,99,235,0.28)',
    icon: <Sparkles size={12} />,
  },
  HECHO: {
    labelKey: 'statusDone',
    solid: '#16a34a',
    soft: 'rgba(22,163,74,0.16)',
    glow: 'rgba(22,163,74,0.24)',
    icon: <CheckCircle2 size={12} />,
  }
};

const PRIORITY_CONF = {
  BAJA:  { labelKey: 'priorityLow',    solid: '#22c55e', soft: 'rgba(34,197,94,0.14)' },
  MEDIA: { labelKey: 'priorityMedium', solid: '#f59e0b', soft: 'rgba(245,158,11,0.14)' },
  ALTA:  { labelKey: 'priorityHigh',   solid: '#ef4444', soft: 'rgba(239,68,68,0.14)' },
};

// 10 filas por pagina, igual que la vista de lista.
const TAREAS_POR_PAGINA = 10;

const getLocale = () => document.documentElement.lang === 'en' ? 'en-US' : 'es-MX';
const formatFecha = (value) =>
  value ? new Date(value).toLocaleDateString(getLocale(), { day: '2-digit', month: 'short' }) : '—';

const formatMes = (value) =>
  new Date(value).toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' });

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const diffDays = (from, to) =>
  Math.max(1, Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000) + 1);

const getTaskDates = (tarea) => {
  const start = new Date(tarea.fechaInicio || tarea.creadoEn);
  const end = new Date(tarea.venceEn || tarea.fechaInicio || tarea.creadoEn);
  return { start, end };
};

const getStatusConf = (estado) => STATUS_CONF[estado] || STATUS_CONF.PENDIENTE;
const getPriorityConf = (prioridad) => PRIORITY_CONF[prioridad] || PRIORITY_CONF.MEDIA;
const getAreaConf = (area) => AREA_COLORS[area] || AREA_COLORS.DEFAULT;

const getTaskAssignees = (tarea) => {
  if (Array.isArray(tarea?.asignados) && tarea.asignados.length > 0) return tarea.asignados;
  return tarea?.asignado ? [tarea.asignado] : [];
};

const getPrimaryAssignee = (tarea) => getTaskAssignees(tarea)[0] || null;

const getTaskAssigneeLabel = (tarea, fallback) => {
  const nombres = getTaskAssignees(tarea).map((asignado) => asignado.nombre).filter(Boolean);
  return nombres.length > 0 ? nombres.join(', ') : fallback;
};

const Tooltip = ({ tarea, rect }) => {
  if (!tarea || !rect) return null;

  const status = getStatusConf(tarea.estado);
  const priority = getPriorityConf(tarea.prioridad);
  const area = getAreaConf(getPrimaryAssignee(tarea)?.area);
  const { start, end } = getTaskDates(tarea);
  const overdue = tarea.estado !== 'HECHO' && tarea.venceEn && startOfDay(tarea.venceEn) < startOfDay(new Date());

  return (
    <div
      style={{
        position: 'fixed',
        top: Math.max(16, rect.top - 156),
        left: Math.max(16, rect.left + rect.width / 2 - 130),
        zIndex: 1000,
        width: '260px',
        background: 'rgba(15,23,42,0.96)',
        border: '1px solid rgba(148,163,184,0.16)',
        borderRadius: '1rem',
        padding: '0.95rem 1rem',
        boxShadow: '0 18px 48px rgba(15,23,42,0.36)',
        pointerEvents: 'none',
        color: '#e2e8f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.55rem' }}>
        <div style={{ fontWeight: 500, color: '#fff', lineHeight: 1.25 }}>{tarea.titulo}</div>
        <span style={{ flexShrink: 0, padding: '0.22rem 0.5rem', borderRadius: '999px', background: priority.soft, color: priority.solid, fontSize: '0.68rem', fontWeight: 500 }}>
          {priority.label}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.77rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={12} color={area.solid} />
          {getTaskAssigneeLabel(tarea, 'Sin asignar')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarRange size={12} color="#60a5fa" />
          {formatFecha(start)} → {formatFecha(end)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flag size={12} color={priority.solid} />
          Duración: {diffDays(start, end)} día{diffDays(start, end) === 1 ? '' : 's'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: status.solid, fontWeight: 500 }}>
          {status.icon}
          {status.label}
        </div>
        {overdue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5', fontWeight: 500 }}>
            <AlertTriangle size={12} />
            Vencida
          </div>
        )}
      </div>
    </div>
  );
};

const GanttView = ({ proyecto, tareas, onSeleccionarTarea }) => {
  const { t } = usePreferences();
  const [hoveredTask, setHoveredTask] = useState(null);
  const [pagina, setPagina] = useState(1);

  const preparedTasks = useMemo(() => (
    tareas.map((tarea) => {
      const { start, end } = getTaskDates(tarea);
      const overdue = tarea.estado !== 'HECHO' && tarea.venceEn && startOfDay(tarea.venceEn) < startOfDay(new Date());
      return {
        ...tarea,
        start,
        end,
        overdue,
        durationDays: diffDays(start, end),
      };
    }).sort((a, b) => a.start - b.start)
  ), [tareas]);

  // Mes en pantalla. Antes se dibujaban de corrido todos los meses del
  // proyecto, asi que con un proyecto de medio ano la tabla se iba varias
  // pantallas a la derecha. Ahora se ve un mes y se navega entre ellos.
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date();
    const primeraTarea = tareas.length > 0
      ? tareas.map((tarea) => getTaskDates(tarea).start).sort((a, b) => a - b)[0]
      : null;
    const fin = proyecto?.fechaFin ? new Date(proyecto.fechaFin) : null;
    // Se arranca en el mes de hoy si el proyecto sigue vivo; si ya termino, en
    // el de su primera tarea, que es donde hay algo que ver.
    const base = (!fin || fin >= hoy) ? hoy : (primeraTarea || hoy);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const range = useMemo(() => ({
    start: new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1),
    end: new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0),
  }), [mesVisible]);

  const days = useMemo(() => {
    const arr = [];
    const cursor = new Date(range.start);
    while (cursor <= range.end) {
      arr.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return arr;
  }, [range]);

  const totalDays = Math.max(1, days.length - 1);

  const moverMes = (delta) => setMesVisible((actual) => (
    new Date(actual.getFullYear(), actual.getMonth() + delta, 1)
  ));

  const metrics = useMemo(() => {
    const total = preparedTasks.length;
    const hechas = preparedTasks.filter((t) => t.estado === 'HECHO').length;
    const enProgreso = preparedTasks.filter((t) => t.estado === 'EN_PROGRESO').length;
    const vencidas = preparedTasks.filter((t) => t.overdue).length;
    const sinAsignar = preparedTasks.filter((t) => !t.asignado?.nombre).length;
    return { total, hechas, enProgreso, vencidas, sinAsignar };
  }, [preparedTasks]);

  // Recortado al mes visible: una tarea que empieza antes o acaba despues se
  // dibuja pegada al borde en vez de salirse de la rejilla.
  const getPosition = (date) => {
    const target = startOfDay(date).getTime();
    const diff = (target - startOfDay(range.start).getTime()) / 86400000;
    return Math.min(100, Math.max(0, (diff / totalDays) * 100));
  };

  /** ¿La tarea toca el mes que se esta viendo? */
  const enElMes = (tarea) => (
    startOfDay(tarea.end) >= startOfDay(range.start) && startOfDay(tarea.start) <= startOfDay(range.end)
  );

  const totalPaginas = Math.max(1, Math.ceil(preparedTasks.length / TAREAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const tareasVisibles = preparedTasks.slice(
    (paginaActual - 1) * TAREAS_POR_PAGINA,
    paginaActual * TAREAS_POR_PAGINA,
  );

  const todayPct = getPosition(new Date());
  // 26px por dia: 31 dias x 26 = 806px, que con la columna de nombres cabe en
  // una pantalla de escritorio sin desplazamiento horizontal.
  const DAY_WIDTH = 26;
  const NAME_WIDTH = 300;

  if (preparedTasks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--color-surface-2)', borderRadius: '1.25rem', color: 'var(--color-text-muted)', display: 'grid', placeItems: 'center', gap: '1rem' }}>
        <div style={{ color: 'var(--color-text-dim)' }}><CalendarRange size={48} /></div>
        <p>No hay tareas programadas para visualizar el Gantt.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {hoveredTask && <Tooltip tarea={hoveredTask.tarea} rect={hoveredTask.rect} />}

      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '1.5rem',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(15,23,42,0.08)',
        }}
      >
        <div style={{ padding: '1.1rem 1.3rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: '', color: '#2563eb', marginBottom: '0.25rem' }}>
              {t('ganttVisualKey')}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text)' }}>
              {t('ganttTimeline')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {[
              { label: t('ganttTotal'),      value: metrics.total,     color: 'var(--color-text)', bg: 'var(--color-surface-3)' },
              { label: t('ganttInProgress'), value: metrics.enProgreso, color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
              { label: t('ganttDone'),       value: metrics.hechas,     color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
              { label: t('ganttOverdue'),    value: metrics.vencidas,   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
            ].map((item) => (
              <div key={item.label} style={{ minWidth: '92px', padding: '0.55rem 0.75rem', borderRadius: '0.95rem', background: item.bg, color: item.color }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 500, textTransform: '', opacity: 0.82 }}>{item.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0.9rem 1.3rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.76rem', fontWeight: 500, color: '#475569' }}>
            <Layers3 size={14} color="#2563eb" />
            {t('ganttBarStatus')}
          </div>
          {Object.entries(STATUS_CONF).map(([key, conf]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '999px', background: conf.solid, boxShadow: `0 0 0 4px ${conf.soft}` }} />
              {t(conf.labelKey)}
            </div>
          ))}
          <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />
          {Object.entries(PRIORITY_CONF).map(([key, conf]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: conf.solid }} />
              {t('projectPriority')} {t(conf.labelKey).toLowerCase()}
            </div>
          ))}
        </div>

        {/* Navegacion de mes. Reemplaza a la fila de cabeceras que dibujaba un
            titulo por cada mes del proyecto y estiraba la tabla a lo ancho. */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-1">
            <Tooltip2 label={t('previous')}>
              <button
                type="button"
                onClick={() => moverMes(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
              >
                <ChevronLeft size={17} />
              </button>
            </Tooltip2>
            <span className="min-w-[150px] text-center text-sm font-medium text-[var(--color-text)] first-letter:uppercase">
              {formatMes(range.start)}
            </span>
            <Tooltip2 label={t('next')}>
              <button
                type="button"
                onClick={() => moverMes(1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
              >
                <ChevronRight size={17} />
              </button>
            </Tooltip2>
          </div>

          <button
            type="button"
            onClick={() => { const h = new Date(); setMesVisible(new Date(h.getFullYear(), h.getMonth(), 1)); }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            {t('dashboardToday')}
          </button>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <div style={{ minWidth: `${NAME_WIDTH + (days.length * DAY_WIDTH)}px`, position: 'relative' }}>
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
              <div
                style={{
                  width: `${NAME_WIDTH}px`,
                  padding: '1rem 1.2rem',
                  borderRight: '1px solid var(--color-border)',
                  background: 'var(--color-surface-3)',
                  position: 'sticky',
                  left: 0,
                  zIndex: 30,
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 500, textTransform: '', color: '#94a3b8' }}>
                  {t('ganttProjectTasks')}
                </div>
                <div style={{ marginTop: '0.3rem', fontSize: '0.92rem', fontWeight: 500, color: 'var(--color-text)' }}>{proyecto?.nombre}</div>
              </div>

              <div className="flex-1">
                <div className="flex">
                  {days.map((day) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isToday = startOfDay(day).getTime() === startOfDay(new Date()).getTime();
                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0',
                          textAlign: 'center',
                          fontSize: '0.68rem',
                          fontWeight: 500,
                          color: isToday ? '#2563eb' : isWeekend ? '#ef4444' : '#94a3b8',
                          background: isToday ? 'rgba(37,99,235,0.06)' : isWeekend ? 'rgba(239,68,68,0.04)' : 'transparent',
                          borderRight: '1px solid rgba(226,232,240,0.55)',
                        }}
                      >
                        {day.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                <div style={{ width: `${NAME_WIDTH}px` }} />
                {days.map((day) => (
                  <div
                    key={`grid-${day.toISOString()}`}
                    style={{
                      flex: 1,
                      borderRight: '1px solid rgba(226,232,240,0.55)',
                      background: day.getDay() === 0 || day.getDay() === 6 ? 'rgba(248,250,252,0.8)' : 'transparent',
                    }}
                  />
                ))}
              </div>

              {tareasVisibles.map((tarea, index) => {
                const status = getStatusConf(tarea.estado);
                const priority = getPriorityConf(tarea.prioridad);
                const area = getAreaConf(getPrimaryAssignee(tarea)?.area);
                const startPct = getPosition(tarea.start);
                const endPct = getPosition(tarea.end);
                const widthPct = Math.max(2.6, endPct - startPct + (100 / totalDays));
                // Las tareas de otros meses conservan su fila para que la
                // paginacion no cambie de contenido al navegar entre meses,
                // pero en vez de barra muestran a que mes pertenecen.
                const visibleEsteMes = enElMes(tarea);

                return (
                  // La fila entera abre la tarea, no solo la barra: en un mes
                  // donde la tarea no cae, la barra ni siquiera se dibuja.
                  <div
                    key={tarea.id}
                    role={onSeleccionarTarea ? 'button' : undefined}
                    tabIndex={onSeleccionarTarea ? 0 : undefined}
                    onClick={() => onSeleccionarTarea?.(tarea)}
                    onKeyDown={(e) => {
                      if (onSeleccionarTarea && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onSeleccionarTarea(tarea);
                      }
                    }}
                    style={{
                      display: 'flex',
                      borderBottom: '1px solid rgba(226,232,240,0.65)',
                      background: index % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(248,250,252,0.7)',
                      cursor: onSeleccionarTarea ? 'pointer' : 'default',
                    }}
                  >
                    <div
                      style={{
                        width: `${NAME_WIDTH}px`,
                        padding: '0.95rem 1.2rem',
                        borderRight: '1px solid var(--color-border)',
                        background: 'rgba(255,255,255,0.94)',
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.2, textDecoration: tarea.estado === 'HECHO' ? 'line-through' : 'none', opacity: tarea.estado === 'HECHO' ? 0.62 : 1 }}>
                            {tarea.titulo}
                          </div>
                          <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.22rem 0.45rem', borderRadius: '999px', background: status.soft, color: status.solid, fontSize: '0.68rem', fontWeight: 500 }}>
                              {status.icon}
                              {t(status.labelKey)}
                            </span>
                            <span style={{ padding: '0.22rem 0.45rem', borderRadius: '999px', background: priority.soft, color: priority.solid, fontSize: '0.68rem', fontWeight: 500 }}>
                              {t(priority.labelKey)}
                            </span>
                            {tarea.overdue && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', padding: '0.22rem 0.45rem', borderRadius: '999px', background: 'rgba(239,68,68,0.12)', color: '#dc2626', fontSize: '0.68rem', fontWeight: 500 }}>
                                <AlertTriangle size={11} />
                                {t('taskOverdue')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Aqui habia un punto con el color del area. Se quito:
                            el area ya va escrita abajo en la misma fila, y su
                            azul de DESARROLLO era el mismo de "En progreso" en
                            la leyenda, asi que se leia como un estado. */}
                      </div>

                      <div style={{ marginTop: '0.7rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.45rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                          <User size={12} color={area.solid} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getTaskAssigneeLabel(tarea, t('ganttUnassigned'))}</span>
                        </span>
                        <span>{tarea.durationDays} día{tarea.durationDays === 1 ? '' : 's'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Flag size={12} color={priority.solid} />
                          {formatFecha(tarea.end)}
                        </span>
                        <span>{getPrimaryAssignee(tarea)?.area || t('ganttGeneralArea')}</span>
                      </div>
                    </div>

                    <div className="flex-1 relative" style={{ minHeight: '86px' }}>
                      {!visibleEsteMes && (
                        <span
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-normal text-[var(--color-text-muted)] first-letter:uppercase"
                        >
                          {formatMes(tarea.start)}
                        </span>
                      )}
                      {visibleEsteMes && (
                      <div
                        onMouseEnter={(e) => setHoveredTask({ tarea, rect: e.currentTarget.getBoundingClientRect() })}
                        onMouseLeave={() => setHoveredTask(null)}
                        style={{
                          position: 'absolute',
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          height: '28px',
                          borderRadius: '999px',
                          background: `linear-gradient(90deg, ${status.solid} 0%, ${status.solid} 72%, ${priority.solid} 100%)`,
                          boxShadow: `0 10px 22px ${status.glow}`,
                          border: '1px solid rgba(255,255,255,0.55)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 46%)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '10px',
                            background: area.solid,
                            opacity: 0.9,
                          }}
                        />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.55rem', padding: '0 0.8rem 0 1rem', color: '#fff', fontSize: '0.72rem', fontWeight: 500 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tarea.durationDays}d
                          </span>
                          <span>{formatFecha(tarea.start)}</span>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {todayPct >= 0 && todayPct <= 100 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${NAME_WIDTH + ((days.length * DAY_WIDTH) * todayPct / 100)}px`,
                  width: '2px',
                  background: 'rgba(239,68,68,0.9)',
                  zIndex: 15,
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.5)',
                }}
              >
                <div style={{ position: 'absolute', top: '10px', left: '-5px', width: '12px', height: '12px', borderRadius: '999px', background: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.14)' }} />
              </div>
            )}
          </div>
        </div>

        {/* Paginacion de tareas. Con 10 filas la tabla ya no crece sin fin
            hacia abajo, igual que en la vista de lista. */}
        {totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] px-4 py-3">
            <span className="text-sm font-normal text-[var(--color-text-muted)]">
              {t('timelineRange', {
                desde: (paginaActual - 1) * TAREAS_POR_PAGINA + 1,
                hasta: Math.min(paginaActual * TAREAS_POR_PAGINA, preparedTasks.length),
                total: preparedTasks.length,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Tooltip2 label={t('previous')}>
                <button
                  type="button"
                  onClick={() => setPagina((n) => Math.max(1, n - 1))}
                  disabled={paginaActual === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
              </Tooltip2>
              <span className="min-w-[70px] text-center text-sm font-medium text-[var(--color-text)]">
                {paginaActual} / {totalPaginas}
              </span>
              <Tooltip2 label={t('next')}>
                <button
                  type="button"
                  onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </Tooltip2>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '0.9rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        <span>{t('ganttShowingTasks', { count: preparedTasks.length, tasks: preparedTasks.length === 1 ? t('projectTaskSingular') : t('projectTaskPlural'), days: days.length })}</span>
        <span>{t('ganttUnassignedCount', { count: metrics.sinAsignar })} · {metrics.vencidas === 1 ? t('ganttOverdueCount', { count: metrics.vencidas }) : t('ganttOverdueCountPlural', { count: metrics.vencidas })}</span>
      </div>
    </div>
  );
};

export default GanttView;
