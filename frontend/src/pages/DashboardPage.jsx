import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { proyectosService, tareasService, statsService } from '../services/api';
import { PageSkeleton } from '../components/Skeleton';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const AREA_CONF = {
  DESARROLLO: { label: 'Desarrollo', color: '#2563eb', bg: 'rgba(37,99,235,0.08)', icon: <Code2 size={18} /> },
  ADMINISTRACION: { label: 'Administracion', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <BarChart3 size={18} /> },
  COMUNICACION: { label: 'Comunicacion', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <Mail size={18} /> },
  MARKETING: { label: 'Marketing', color: '#db2777', bg: 'rgba(219,39,119,0.08)', icon: <Megaphone size={18} /> },
};

const IconProjects = () => <Layers size={20} strokeWidth={2.5} />;
const IconTasks = () => <ClipboardList size={20} strokeWidth={2.5} />;
const IconChart = () => <BarChart3 size={20} strokeWidth={2.5} />;
const IconTeam = () => <Users size={20} strokeWidth={2.5} />;
const IconCheck = () => <CheckCircle2 size={20} strokeWidth={2.5} />;

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos dias';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const formatMonthLabel = (date) =>
  date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getProjectRange = (project) => {
  const startCandidates = [project?.fechaInicio, project?.creadoEn].filter(Boolean);
  const endCandidates = [project?.fechaFin].filter(Boolean);

  const start = startCandidates.length
    ? new Date(Math.min(...startCandidates.map((value) => new Date(value).getTime())))
    : new Date();
  const end = endCandidates.length
    ? new Date(Math.max(...endCandidates.map((value) => new Date(value).getTime())))
    : new Date(start.getTime() + (7 * 24 * 60 * 60 * 1000));

  return { start, end };
};

const getProjectStats = (project) => ({
  porcentaje: project?.progresoGeneral ?? project?.progreso ?? 0,
  totalTareas: project?._count?.tareas ?? 0,
  estado: project?.estado || 'ACTIVO',
  miembros: project?.miembros?.length ?? 0,
});

const buildCalendarDays = (monthDate) => {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const day = start.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const isDateBetween = (date, start, end) => {
  const target = startOfDay(date).getTime();
  return target >= startOfDay(start).getTime() && target <= endOfDay(end).getTime();
};

const StatCard = ({ value, sub, icon, color, bg, onClick, helper }) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-white p-5 lg:p-6 rounded-[24px] shadow-sm border border-slate-50 flex items-center justify-between min-w-[140px] h-[110px] lg:h-[120px] text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
  >
    <div className="flex flex-col gap-0.5">
      <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-none">
        {value}
      </div>
      {sub && <div className="text-[10px] lg:text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">{sub}</div>}
      {helper && <div className="text-[10px] text-blue-600 font-bold mt-1">{helper}</div>}
    </div>
    <div
      className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
      style={{ background: bg || `${color}10`, color }}
    >
      {icon}
    </div>
  </button>
);

const MiniTask = ({ tarea, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen?.(tarea)}
    style={{ padding: '0.65rem 0', borderBottom: '1px solid rgba(148,163,184,0.16)', width: '100%', textAlign: 'left' }}
  >
    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', lineHeight: 1.25 }}>
      {tarea.titulo}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tarea.proyecto?.nombre || 'Sin proyecto'}</span>
      {tarea.venceEn && <span>{new Date(tarea.venceEn).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</span>}
    </div>
  </button>
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
    <div style={{ minHeight: '48px', maxHeight: '260px', overflowY: 'auto', paddingRight: '0.3rem' }}>{children}</div>
  </div>
);

const AdminMemberActivity = ({ miembros, onOpenTask }) => {
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '72vh', overflowY: 'auto', paddingRight: '0.35rem' }}>
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
                {miembro.hechasHoy.length ? miembro.hechasHoy.map((t) => <MiniTask key={t.id} tarea={t} onOpen={onOpenTask} />) : <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Sin completadas hoy</span>}
              </ActivityBucket>
              <ActivityBucket label="Haciendo" count={miembro.totales.enProgreso} color="#2563eb" icon={<PlayCircle size={15} />}>
                {miembro.enProgreso.length ? miembro.enProgreso.map((t) => <MiniTask key={t.id} tarea={t} onOpen={onOpenTask} />) : <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Sin tareas en curso</span>}
              </ActivityBucket>
              <ActivityBucket label="Faltan hoy" count={miembro.totales.faltanHoy} color="#dc2626" icon={<Clock size={15} />}>
                {miembro.faltanHoy.length ? miembro.faltanHoy.map((t) => <MiniTask key={t.id} tarea={t} onOpen={onOpenTask} />) : <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Sin pendientes de hoy</span>}
              </ActivityBucket>
              <ActivityBucket label="Faltan semana" count={miembro.totales.faltanSemana} color="#f59e0b" icon={<CalendarDays size={15} />}>
                {miembro.faltanSemana.length ? miembro.faltanSemana.map((t) => <MiniTask key={t.id} tarea={t} onOpen={onOpenTask} />) : <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Sin pendientes proximos</span>}
              </ActivityBucket>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProjectCalendarPanel = ({
  monthDate,
  onMonthChange,
  projectEntries,
  onSelectProject,
  selectedProjectId,
  headerAction = null,
  embedded = false,
}) => {
  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const weekLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const todayKey = startOfDay(new Date()).getTime();
  const [expandedDay, setExpandedDay] = useState(null);

  const closeExpandedDay = () => setExpandedDay(null);
  const content = (
    <>
      {!embedded && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', marginBottom: '0.2rem' }}>Calendario de proyectos</h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Selecciona un proyecto desde sus fechas activas.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {headerAction}
              <button type="button" onClick={() => onMonthChange(-1)} className="btn-icon-sm"><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => onMonthChange(1)} className="btn-icon-sm"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: '900', textTransform: 'uppercase', color: '#2563eb', marginBottom: '0.85rem', letterSpacing: '0.06em' }}>
            {formatMonthLabel(monthDate)}
          </div>
        </>
      )}

      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '900', textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.06em' }}>
            {formatMonthLabel(monthDate)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {headerAction}
            <button type="button" onClick={() => onMonthChange(-1)} className="btn-icon-sm"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => onMonthChange(1)} className="btn-icon-sm"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.45rem' }}>
        {weekLabels.map((label) => (
          <div key={label} style={{ fontSize: '0.68rem', fontWeight: '900', color: '#94a3b8', textAlign: 'center', textTransform: 'uppercase' }}>
            {label}
          </div>
        ))}

        {days.map((day) => {
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();
          const dayProjects = projectEntries.filter((entry) => isDateBetween(day, entry.start, entry.end));
          const isToday = startOfDay(day).getTime() === todayKey;

          return (
            <div
              key={day.toISOString()}
              style={{
                minHeight: '94px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                background: isCurrentMonth ? '#fff' : '#f8fafc',
                padding: '0.55rem',
                opacity: isCurrentMonth ? 1 : 0.55,
                boxShadow: isToday ? 'inset 0 0 0 2px rgba(37,99,235,0.16)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '900', color: isToday ? '#2563eb' : '#0f172a' }}>{day.getDate()}</span>
                {dayProjects.length > 0 && <span style={{ fontSize: '0.62rem', fontWeight: '900', color: '#2563eb' }}>{dayProjects.length}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {dayProjects.slice(0, 2).map((entry) => (
                  <button
                    key={`${entry.project.id}-${day.toISOString()}`}
                    type="button"
                    onClick={() => onSelectProject(entry.project.id)}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.25rem 0.4rem',
                      background: selectedProjectId === entry.project.id ? '#2563eb' : 'rgba(37,99,235,0.08)',
                      color: selectedProjectId === entry.project.id ? '#fff' : '#2563eb',
                      borderLeft: selectedProjectId === entry.project.id ? 'none' : '2px solid #2563eb',
                      fontSize: '0.55rem',
                      fontWeight: '900',
                      textAlign: 'left',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {entry.project.nombre}
                  </button>
                ))}
                {dayProjects.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setExpandedDay({ date: day, projects: dayProjects })}
                    style={{ fontSize: '0.6rem', fontWeight: '800', color: '#64748b', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    +{dayProjects.length - 2} mas
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {embedded ? content : <div className="card" style={{ padding: '1.5rem' }}>{content}</div>}

      {expandedDay && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) closeExpandedDay();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(6px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div style={{ width: '100%', maxWidth: '560px', maxHeight: '80vh', overflow: 'hidden', background: '#fff', borderRadius: '24px', boxShadow: '0 24px 70px rgba(15,23,42,0.2)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#0f172a', marginBottom: '0.2rem' }}>
                  Proyectos del {expandedDay.date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>
                  {expandedDay.projects.length} proyectos activos en esta fecha
                </p>
              </div>
              <button type="button" onClick={closeExpandedDay} className="btn-icon-sm">
                <ArrowRight size={16} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <div style={{ padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 'calc(80vh - 88px)', overflowY: 'auto' }}>
              {expandedDay.projects.map((entry) => (
                <button
                  key={`${entry.project.id}-expanded`}
                  type="button"
                  onClick={() => {
                    onSelectProject(entry.project.id);
                    closeExpandedDay();
                  }}
                  style={{ width: '100%', textAlign: 'left', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '0.95rem 1rem', background: selectedProjectId === entry.project.id ? '#eff6ff' : '#fff', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.45rem' }}>
                    <span style={{ fontWeight: '900', color: '#0f172a' }}>{entry.project.nombre}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#2563eb' }}>{entry.project.progresoGeneral ?? entry.project.progreso ?? 0}%</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>
                    {new Date(entry.start).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - {new Date(entry.end).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ProjectTimeline = ({ projectEntries, selectedProjectId, onSelectProject }) => {
  const validEntries = projectEntries.filter((entry) => entry.start && entry.end);

  const range = useMemo(() => {
    if (!validEntries.length) {
      const start = new Date();
      const end = new Date(start.getTime() + (14 * 24 * 60 * 60 * 1000));
      return { start, end };
    }

    return {
      start: new Date(Math.min(...validEntries.map((entry) => entry.start.getTime()))),
      end: new Date(Math.max(...validEntries.map((entry) => entry.end.getTime()))),
    };
  }, [validEntries]);

  const totalDays = Math.max(1, Math.ceil((endOfDay(range.end) - startOfDay(range.start)) / (1000 * 60 * 60 * 24)));

  const months = useMemo(() => {
    const items = [];
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

    while (cursor <= endMonth) {
      const monthStart = new Date(cursor);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const visibleStart = monthStart < range.start ? range.start : monthStart;
      const visibleEnd = monthEnd > range.end ? range.end : monthEnd;
      const days = Math.max(1, Math.ceil((endOfDay(visibleEnd) - startOfDay(visibleStart)) / (1000 * 60 * 60 * 24)));

      items.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: cursor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
        width: `${(days / totalDays) * 100}%`,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return items;
  }, [range.end, range.start, totalDays]);

  const getOffset = (date) => ((startOfDay(date) - startOfDay(range.start)) / (1000 * 60 * 60 * 24) / totalDays) * 100;

  if (!validEntries.length) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '20px', color: '#64748b', fontWeight: '700' }}>
        No hay proyectos con fechas para mostrar en la linea de tiempo.
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <div style={{ width: '240px', minWidth: '240px', padding: '1rem 1.25rem', borderRight: '1px solid #e2e8f0', fontSize: '0.72rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Proyectos
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          {months.map((month) => (
            <div key={month.key} style={{ width: month.width, padding: '1rem 0.75rem', borderRight: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {month.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
        {validEntries.map((entry, index) => {
          const offset = getOffset(entry.start);
          const width = Math.max(4, getOffset(entry.end) - offset);
          const selected = selectedProjectId === entry.project.id;
          const progress = entry.project.progresoGeneral ?? entry.project.progreso ?? 0;

          return (
            <button
              key={entry.project.id}
              type="button"
              onClick={() => onSelectProject(entry.project.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'stretch',
                border: 'none',
                borderBottom: index < validEntries.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: selected ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ width: '240px', minWidth: '240px', padding: '1rem 1.25rem', borderRight: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '900', color: '#0f172a', marginBottom: '0.25rem' }}>{entry.project.nombre}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>
                  {entry.project.estado || 'ACTIVO'} · {progress}% · {entry.project._count?.tareas || 0} tareas
                </div>
              </div>

              <div style={{ flex: 1, position: 'relative', minHeight: '72px', padding: '1rem 0.75rem' }}>
                <div style={{ position: 'absolute', left: `${offset}%`, width: `${width}%`, top: '50%', transform: 'translateY(-50%)', height: '18px', borderRadius: '999px', background: selected ? '#1d4ed8' : '#2563eb', boxShadow: selected ? '0 8px 20px rgba(37,99,235,0.28)' : '0 6px 16px rgba(37,99,235,0.18)' }}>
                  <div style={{ width: `${progress}%`, maxWidth: '100%', height: '100%', borderRadius: '999px', background: '#93c5fd' }} />
                </div>
                <div style={{ position: 'absolute', left: `${offset}%`, top: 'calc(50% + 16px)', fontSize: '0.66rem', fontWeight: '800', color: '#64748b' }}>
                  {new Date(entry.start).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                </div>
                <div style={{ position: 'absolute', left: `calc(${offset + width}% - 44px)`, top: 'calc(50% + 16px)', fontSize: '0.66rem', fontWeight: '800', color: '#64748b' }}>
                  {new Date(entry.end).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            </button>
          );
        })}
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

  if (cargando) return <PageSkeleton cards={4} />;

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
        <StatCard value={proyectos.length} icon={<IconProjects />} color="#2563eb" bg="#eff6ff" sub="PROYECTOS" helper="Ver proyectos" onClick={() => navigate('/proyectos')} />
        <StatCard value={pendientes.length} icon={<IconTasks />} color="#64748b" bg="#f8fafc" sub="PENDIENTES" helper="Abrir tablero" onClick={() => navigate('/proyectos')} />
        <StatCard value={enProgreso.length} icon={<IconTasks />} color="#8b5cf6" bg="#f5f3ff" sub="EN MARCHA" helper="Seguir tareas" onClick={() => navigate('/proyectos')} />
        <StatCard value={hechas.length} icon={<IconCheck />} color="#10b981" bg="#f0fdf4" sub="HECHAS" helper="Ver agenda" onClick={() => navigate('/agenda')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Proyectos en los que participas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {proyectos.map((p) => (
              <button key={p.id} type="button" onClick={() => navigate(`/proyectos/${p.id}`)} className="card" style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', textAlign: 'left' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{p.nombre}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{p._count?.tareas || 0} tareas asignadas</div>
                </div>
                <span style={{ color: 'var(--color-primary)', display: 'flex' }}><ArrowRight size={20} /></span>
              </button>
            ))}
          </div>
        </div>

        {proximas.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem' }}>Proximas a vencer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {proximas.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/proyectos/${t.proyectoId || t.proyecto?.id}`)}
                  style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t.titulo}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={10} /> {new Date(t.venceEn).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{t.prioridad}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TeamOccupationCalendar = ({ miembros, embedded = false }) => {
  const [selectedId, setSelectedId] = useState(miembros[0]?.id || null);
  const [monthDate, setMonthDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState(null);

  const days = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const weekLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  const todayKey = startOfDay(new Date()).getTime();

  const selectedMember = useMemo(() => miembros.find(m => m.id === selectedId), [miembros, selectedId]);

  const onMonthChange = (delta) => {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1));
  };

  if (!miembros?.length) return null;

  const content = (
    <>
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '0.25rem' }}>Disponibilidad del Equipo</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>Ocupacion por proyectos (azul) y tareas (verde) por miembro.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button type="button" onClick={() => onMonthChange(-1)} className="btn-icon-sm"><ChevronLeft size={16} /></button>
            <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', minWidth: '140px', textAlign: 'center' }}>
              {formatMonthLabel(monthDate)}
            </div>
            <button type="button" onClick={() => onMonthChange(1)} className="btn-icon-sm"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '900', textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.06em' }}>
            {formatMonthLabel(monthDate)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button type="button" onClick={() => onMonthChange(-1)} className="btn-icon-sm"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => onMonthChange(1)} className="btn-icon-sm"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', pb: '1rem', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
        {miembros.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '16px',
              border: '1px solid',
              borderColor: selectedId === m.id ? '#2563eb' : '#e2e8f0',
              background: selectedId === m.id ? '#eff6ff' : '#fff',
              color: selectedId === m.id ? '#2563eb' : '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: selectedId === m.id ? '#2563eb' : '#f1f5f9', color: selectedId === m.id ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '900' }}>
              {m.nombre.charAt(0)}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: '800' }}>{m.nombre}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.6rem' }}>
        {weekLabels.map(l => (
          <div key={l} style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textAlign: 'center', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{l}</div>
        ))}

        {days.map(day => {
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();
          const isToday = startOfDay(day).getTime() === todayKey;
          const occupancyOnDay = selectedMember?.ocupacionCalendario?.filter((item) =>
            isDateBetween(day, item.fechaInicio, item.fechaFin)
          ) || selectedMember?.todasConFecha?.filter((t) =>
            isDateBetween(day, t.fechaInicio || t.creadoEn, t.venceEn || t.completadoEn || t.creadoEn)
          ).map((t) => ({
            ...t,
            tipo: 'tarea',
            fechaFin: t.venceEn || t.completadoEn || t.creadoEn,
          })) || [];

          const projectCount = occupancyOnDay.filter((item) => item.tipo === 'proyecto').length;
          const taskCount = occupancyOnDay.filter((item) => item.tipo === 'tarea').length;
          const eventCount = occupancyOnDay.filter((item) => item.tipo === 'evento').length;

          return (
            <div
              key={day.toISOString()}
              onClick={() => occupancyOnDay.length > 0 && setExpandedDay({ date: day, tasks: occupancyOnDay })}
              style={{
                minHeight: '110px',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                background: isCurrentMonth 
                  ? (projectCount > 0 ? '#f0f7ff' : taskCount > 0 ? '#f0fdf4' : eventCount > 0 ? '#faf5ff' : '#fff') 
                  : '#f8fafc',
                padding: '0.65rem',
                opacity: isCurrentMonth ? 1 : 0.4,
                cursor: occupancyOnDay.length > 0 ? 'pointer' : 'default',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                boxShadow: isToday ? 'inset 0 0 0 2px rgba(37,99,235,0.1)' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
              className={occupancyOnDay.length > 0 ? 'hover:border-blue-200 hover:shadow-md' : ''}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: '900', color: isToday ? '#2563eb' : '#0f172a', position: 'relative', zIndex: 2 }}>
                {day.getDate()}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', position: 'relative', zIndex: 2 }}>
                {projectCount > 0 && (
                  <div style={{ 
                    padding: '0.25rem 0.4rem', 
                    borderRadius: '6px', 
                    background: 'rgba(37,99,235,0.08)', 
                    color: '#2563eb', 
                    fontSize: '0.55rem', 
                    fontWeight: '900',
                    borderLeft: '2px solid #2563eb',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {projectCount} Proyecto{projectCount > 1 ? 's' : ''}
                  </div>
                )}
                
                {taskCount > 0 && (
                  <div style={{ 
                    padding: '0.25rem 0.4rem', 
                    borderRadius: '6px', 
                    background: 'rgba(22,163,74,0.08)', 
                    color: '#16a34a', 
                    fontSize: '0.55rem', 
                    fontWeight: '900',
                    borderLeft: '2px solid #16a34a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {taskCount} Tarea{taskCount > 1 ? 's' : ''}
                  </div>
                )}

                {eventCount > 0 && (
                  <div style={{ 
                    padding: '0.25rem 0.4rem', 
                    borderRadius: '6px', 
                    background: 'rgba(124,58,237,0.08)', 
                    color: '#7c3aed', 
                    fontSize: '0.55rem', 
                    fontWeight: '900',
                    borderLeft: '2px solid #7c3aed',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {eventCount} Evento{eventCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className={embedded ? '' : 'card'} style={embedded ? undefined : { padding: '2rem', marginBottom: '3.5rem' }}>
      {content}

      {expandedDay && (
        <div
          onClick={(e) => e.target === e.currentTarget && setExpandedDay(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div style={{ width: '100%', maxWidth: '500px', background: '#fff', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '1.75rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>{expandedDay.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Agenda de {selectedMember?.nombre}</p>
              </div>
              <button onClick={() => setExpandedDay(null)} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-100">
                <ChevronDown size={20} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </div>
            <div style={{ padding: '1.5rem 2rem 2rem', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {expandedDay.tasks.map(t => (
                <div key={t.id} style={{ padding: '1.1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#0f172a' }}>{t.titulo}</div>
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: '900',
                      color: t.tipo === 'proyecto' ? '#2563eb' : t.tipo === 'evento' ? '#7c3aed' : '#16a34a',
                      background: t.tipo === 'proyecto' ? '#eff6ff' : t.tipo === 'evento' ? '#f5f3ff' : '#f0fdf4',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      height: 'fit-content'
                    }}>
                      {t.tipo === 'proyecto' ? 'PROYECTO' : t.tipo === 'evento' ? 'EVENTO' : 'TAREA'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.tipo === 'proyecto' ? '#2563eb' : t.tipo === 'evento' ? '#7c3aed' : '#16a34a' }} />
                    {t.proyecto?.nombre || (t.tipo === 'evento' ? 'Evento personal' : 'Sin proyecto')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [ganttCollapsed, setGanttCollapsed] = useState(true);
  const [calendarCollapsed, setCalendarCollapsed] = useState(true);
  const [activeCalendarView, setActiveCalendarView] = useState('projects');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [statsData, projectsData] = await Promise.all([
          statsService.getAdminStats(),
          proyectosService.listar(),
        ]);

        setStats(statsData);
        setProjects(projectsData.proyectos || []);
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const openTaskProject = (task) => {
    const projectId = task?.proyecto?.id || task?.proyectoId || selectedProjectId;
    if (projectId) navigate(`/proyectos/${projectId}`);
  };

  const projectEntries = useMemo(() => (
    projects.map((project) => {
      const range = getProjectRange(project);
      return { project, start: range.start, end: range.end };
    })
  ), [projects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectedProjectStats = selectedProject ? getProjectStats(selectedProject) : null;
  const globalDone = stats?.tareas?.estados?.find((estado) => estado.estado === 'HECHO')?._count || 0;

  if (cargando) return <PageSkeleton cards={4} />;
  if (!stats) return <div style={{ padding: '4rem', textAlign: 'center' }}>Error de conexion</div>;

  const { proyectos, tareas, topUsuarios, actividadReciente, proyectosProgreso, actividadMiembros } = stats;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">Control Central</h1>
          <p className="text-sm lg:text-base text-slate-500 mt-1">Supervision estrategica del equipo CRM RED 4</p>
        </div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        <StatCard value={proyectos.total} icon={<IconProjects />} color="#2563eb" bg="#eff6ff" sub="PROYECTOS" helper="Gestionar proyectos" onClick={() => navigate('/proyectos')} />
        <StatCard value={globalDone} icon={<IconTasks />} color="#10b981" bg="#f0fdf4" sub="FINALIZADAS" helper="Ver avance" onClick={() => navigate('/proyectos')} />
        <StatCard value={topUsuarios.length} icon={<IconTeam />} color="#8b5cf6" bg="#f5f3ff" sub="EQUIPO" helper="Abrir comunidad" onClick={() => navigate('/equipo')} />
        <StatCard value={`${Math.round((globalDone / (tareas.total || 1)) * 100)}%`} icon={<IconChart />} color="#f59e0b" bg="#fffbeb" sub="EFICIENCIA" helper="Abrir agenda" onClick={() => navigate('/agenda')} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '0.3rem' }}>Gantt general de proyectos</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>
                {selectedProject ? `Vista enfocada en ${selectedProject.nombre}` : 'Vista global solo con fechas y avance de proyectos'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setGanttCollapsed((value) => !value)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest border border-slate-200 flex items-center gap-2"
              >
                {ganttCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                {ganttCollapsed ? 'Expandir' : 'Minimizar'}
              </button>
              <button
                type="button"
                onClick={() => navigate(selectedProject ? `/proyectos/${selectedProject.id}` : '/proyectos')}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest border border-blue-100"
              >
                {selectedProject ? 'Abrir proyecto' : 'Ver tablero'}
              </button>
            </div>
          </div>

          {!ganttCollapsed && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(null)}
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: '999px',
                    border: '1px solid #dbeafe',
                    background: selectedProjectId === null ? '#2563eb' : '#eff6ff',
                    color: selectedProjectId === null ? '#fff' : '#2563eb',
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    cursor: 'pointer',
                  }}
                >
                  Todos
                </button>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    style={{
                      padding: '0.55rem 0.85rem',
                      borderRadius: '999px',
                      border: '1px solid #e2e8f0',
                      background: selectedProjectId === project.id ? '#0f172a' : '#fff',
                      color: selectedProjectId === project.id ? '#fff' : '#334155',
                      fontSize: '0.72rem',
                      fontWeight: '900',
                      cursor: 'pointer',
                    }}
                  >
                    {project.nombre}
                  </button>
                ))}
              </div>

              <ProjectTimeline projectEntries={projectEntries} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />
            </>
          )}

          {ganttCollapsed && (
            <div style={{ padding: '0.85rem 1rem', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>
              El gantt esta minimizado. Puedes expandirlo cuando necesites revisar la linea de tiempo.
            </div>
          )}
        </div>

        <div>
          {!calendarCollapsed && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '900', marginBottom: '0.2rem' }}>Calendarios del tablero</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>
                    {activeCalendarView === 'projects'
                      ? 'Selecciona un proyecto desde sus fechas activas.'
                      : 'Visualiza la ocupacion del equipo por proyectos y tareas.'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setActiveCalendarView('projects')}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors"
                    style={{
                      background: activeCalendarView === 'projects' ? '#eff6ff' : '#fff',
                      color: activeCalendarView === 'projects' ? '#2563eb' : '#64748b',
                      borderColor: activeCalendarView === 'projects' ? '#bfdbfe' : '#e2e8f0',
                    }}
                  >
                    Calendario de proyectos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCalendarView('team')}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors"
                    style={{
                      background: activeCalendarView === 'team' ? '#eff6ff' : '#fff',
                      color: activeCalendarView === 'team' ? '#2563eb' : '#64748b',
                      borderColor: activeCalendarView === 'team' ? '#bfdbfe' : '#e2e8f0',
                    }}
                  >
                    Disponibilidad de equipo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCollapsed(true)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest border border-slate-200 flex items-center gap-2"
                  >
                    <ChevronUp size={14} />
                    Minimizar
                  </button>
                </div>
              </div>

              {activeCalendarView === 'projects' ? (
                <ProjectCalendarPanel
                  monthDate={calendarMonth}
                  onMonthChange={(delta) => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))}
                  projectEntries={projectEntries}
                  onSelectProject={setSelectedProjectId}
                  selectedProjectId={selectedProjectId}
                  embedded
                />
              ) : (
                <TeamOccupationCalendar miembros={actividadMiembros} embedded />
              )}
            </div>
          )}

          {calendarCollapsed && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '900', marginBottom: '0.2rem' }}>Calendarios del tablero</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Alterna entre el calendario de proyectos y la disponibilidad del equipo.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarCollapsed(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest border border-slate-200 flex items-center gap-2"
                >
                  <ChevronDown size={14} />
                  Expandir
                </button>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b', fontWeight: '700' }}>
                Esta seccion esta minimizada. Puedes expandirla para revisar proyectos o disponibilidad del equipo.
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '2rem' }}>Progreso de Proyectos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {(selectedProject && selectedProjectStats
              ? [{
                  id: selectedProject.id,
                  nombre: selectedProject.nombre,
                  porcentaje: selectedProjectStats.porcentaje,
                  totalTareas: selectedProjectStats.totalTareas,
                  estado: selectedProjectStats.estado,
                  miembros: selectedProjectStats.miembros,
                  inicio: selectedProject.fechaInicio,
                }]
              : proyectosProgreso
            ).map((p) => (
              <button key={p.id} type="button" onClick={() => navigate(`/proyectos/${p.id}`)} style={{ width: '100%', textAlign: 'left', padding: '1rem 1.1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem', fontWeight: '700', gap: '1rem' }}>
                  <span>{p.nombre}</span>
                  <span style={{ color: 'var(--color-primary-light)' }}>{p.porcentaje}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--color-surface-3)', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.8rem' }}>
                  <div style={{ width: `${p.porcentaje}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 1s ease' }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#2563eb', background: '#eff6ff', padding: '0.28rem 0.5rem', borderRadius: '999px' }}>
                    {(p.totalTareas ?? projects.find((project) => project.id === p.id)?._count?.tareas ?? 0)} tareas
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#16a34a', background: '#f0fdf4', padding: '0.28rem 0.5rem', borderRadius: '999px' }}>
                    {p.estado ?? projects.find((project) => project.id === p.id)?.estado ?? 'ACTIVO'}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#8b5cf6', background: '#f5f3ff', padding: '0.28rem 0.5rem', borderRadius: '999px' }}>
                    {(p.miembros ?? projects.find((project) => project.id === p.id)?.miembros?.length ?? 0)} miembros
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: '900', color: '#f59e0b', background: '#fff7ed', padding: '0.28rem 0.5rem', borderRadius: '999px' }}>
                    {(p.inicio ?? projects.find((project) => project.id === p.id)?.fechaInicio)
                      ? new Date(p.inicio ?? projects.find((project) => project.id === p.id)?.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                      : 'Sin fecha'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '2rem' }}>Top Productividad</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topUsuarios.map((u, idx) => (
              <button key={u.id} type="button" onClick={() => navigate(`/usuarios?actividad=${u.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-surface-3)', borderRadius: '1rem', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: idx === 0 ? '#fbbf24' : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: idx === 0 ? '#000' : '#fff' }}>{idx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{u.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.area}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '900', color: 'var(--color-primary-light)', fontSize: '1.25rem' }}>{u.promedioSemanal}</div>
                  <div style={{ fontSize: '0.66rem', fontWeight: '800', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    por semana
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AdminMemberActivity miembros={actividadMiembros} onOpenTask={openTaskProject} />

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>Flujo Reciente de Actividad</h3>
          <button type="button" onClick={() => navigate('/proyectos')} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest border border-slate-200">
            Ir a proyectos
          </button>
        </div>
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
