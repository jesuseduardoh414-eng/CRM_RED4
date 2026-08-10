import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { proyectosService, statsService } from '../services/api';
import { usePreferences } from '../context/PreferencesContext';
import { PageSkeleton } from '../components/Skeleton';
import Tooltip from '../components/Tooltip';
import CampoFiltro from '../components/CampoFiltro';
import UserAvatar from '../components/UserAvatar';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ESTADOS_PROYECTO, getEstadoProyecto, normalizarEstadoProyecto } from '../utils/estadosProyecto';
import { imprimirReporteDia } from '../utils/reporteDia';
import {
  Layers,
  FolderKanban,
  CheckCircle2,
  BarChart3,
  Code2,
  Mail,
  ArrowRight,
  ClipboardList,
  AlertCircle,
  X,
  Clock,
  PlayCircle,
  User,
  Megaphone,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Search} from 'lucide-react';

const AREA_CONF = {
  DESARROLLO:     { labelKey: 'areaDesarrollo',    color: '#2563eb', bg: 'rgba(37,99,235,0.08)', icon: <Code2 size={18} /> },
  ADMINISTRACION: { labelKey: 'areaAdministracion', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <BarChart3 size={18} /> },
  COMUNICACION:   { labelKey: 'areaComunicacion',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <Mail size={18} /> },
  MARKETING:      { labelKey: 'areaMarketing',      color: '#db2777', bg: 'rgba(219,39,119,0.08)', icon: <Megaphone size={18} /> },
};


const IconProjects = () => <Layers size={16} strokeWidth={2} />;
const IconTasks = () => <ClipboardList size={16} strokeWidth={2} />;
const IconCheck = () => <CheckCircle2 size={16} strokeWidth={2} />;

const saludo = (t) => {
  const h = new Date().getHours();
  if (h < 12) return t('dashboardGoodMorning');
  if (h < 19) return t('dashboardGoodAfternoon');
  return t('dashboardGoodEvening');
};


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

/**
 * Fecha de fin de un proyecto para la linea de tiempo, en tres niveles segun
 * que tan real sea el dato:
 *
 * 'real' → tiene fechaFin capturada
 * 'deducida' → no la tiene, pero se usa el cierre de su ultima tarea hecha
 * 'estimada' → no hay nada; se dibujan 7 dias solo para que la barra exista
 *
 * Solo la ultima se marca visualmente, porque es la unica inventada.
 */
const getProjectRange = (project) => {
  const startCandidates = [project?.fechaInicio, project?.creadoEn].filter(Boolean);
  const start = startCandidates.length
    ? new Date(Math.min(...startCandidates.map((value) => new Date(value).getTime())))
    : new Date();

  if (project?.fechaFin) {
    return { start, end: new Date(project.fechaFin), origenFin: 'real' };
  }

  const ultimoCierre = project?.ultimaTareaCompletadaEn
    ? new Date(project.ultimaTareaCompletadaEn)
    : null;

  // Solo sirve si el cierre es posterior al inicio; si no, la barra saldria al reves
  if (ultimoCierre && !Number.isNaN(ultimoCierre.getTime()) && ultimoCierre > start) {
    return { start, end: ultimoCierre, origenFin: 'deducida' };
  }

  return {
    start,
    end: new Date(start.getTime() + (7 * 24 * 60 * 60 * 1000)),
    origenFin: 'estimada'
  };
};

// Solo la primera letra. El `capitalize` de CSS pone mayuscula a cada palabra
// y dejaba "Mayo De 2026" en vez de "Mayo de 2026".
const capitalizar = (texto = '') => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto);

/**
 * Elige texto claro u oscuro segun que tan luminoso sea el fondo.
 * Las barras usan el color del proyecto, y sobre los tonos claros (verde lima,
 * amarillo) el blanco no se alcanzaba a leer.
 */
const textoLegibleSobre = (hex) => {
  const limpio = String(hex || '').replace('#', '');
  if (limpio.length < 6) return '#ffffff';
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  // Luminancia percibida (los ojos pesan mas el verde que el azul)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#0f172a' : '#ffffff';
};

// Densidad de la linea de tiempo. Con "mes" un proyecto de 4 dias mide ~32px;
// con "semana" mide ~96px y se puede leer.
const ESCALAS_TIMELINE = {
  semana: { labelKey: 'timelineWeek', pxPorDia: 24 },
  mes: { labelKey: 'timelineMonth', pxPorDia: 8 },
  trimestre: { labelKey: 'timelineQuarter', pxPorDia: 2.8 }
};









const PROJECT_TIMELINE_COLORS = [
  { solid: '#2563eb', soft: 'rgba(37,99,235,0.16)', accent: '#93c5fd' },
  { solid: '#0f766e', soft: 'rgba(15,118,110,0.16)', accent: '#5eead4' },
  { solid: '#c2410c', soft: 'rgba(194,65,12,0.16)', accent: '#fdba74' },
  { solid: '#7c3aed', soft: 'rgba(124,58,237,0.16)', accent: '#c4b5fd' },
  { solid: '#db2777', soft: 'rgba(219,39,119,0.16)', accent: '#f9a8d4' },
  { solid: '#65a30d', soft: 'rgba(101,163,13,0.16)', accent: '#bef264' },
  { solid: '#1d4ed8', soft: 'rgba(29,78,216,0.16)', accent: '#60a5fa' },
  { solid: '#b45309', soft: 'rgba(180,83,9,0.16)', accent: '#fbbf24' },
];


const getProjectTimelineColor = (project) => {
  const seed = String(project?.nombre || project?.id || '')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PROJECT_TIMELINE_COLORS[seed % PROJECT_TIMELINE_COLORS.length];
};

const getAreaLabel = (area, t) => t(AREA_CONF[String(area || '').toUpperCase()]?.labelKey || 'areaGeneral');



/**
 * Indicador del inicio, en una sola linea: icono, numero y etiqueta juntos.
 * Sin caja, sin sombra y sin fondo en el icono.
 */
const StatCard = ({ value, sub, icon, color, onClick, primero }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-baseline gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--color-surface-3)] ${
      primero ? '' : 'border-l border-[var(--color-border)] pl-4 ml-1'
    }`}
  >
    <span className="self-center" style={{ color }}>{icon}</span>
    <span className="text-xl font-semibold text-[var(--color-text)] tracking-tight leading-none">
        {value}
    </span>
    {sub && <span className="text-sm font-normal text-[var(--color-text-muted)]">{sub}</span>}
  </button>
);

/**
 * `mostrarHora` se usa en las completadas: ahi interesa a que hora se cerro la
 * tarea, no su fecha de vencimiento.
 */
const MiniTask = ({ tarea, onOpen, mostrarHora = false }) => {
  const { locale } = usePreferences();
  const hora = mostrarHora && tarea.completadoEn
    ? new Date(tarea.completadoEn).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button
      type="button"
    onClick={() => onOpen?.(tarea)}
    style={{ padding: '0.65rem 0', borderBottom: '1px solid rgba(148,163,184,0.16)', width: '100%', textAlign: 'left' }}
    >
      <div className="text-sm font-medium text-[var(--color-text)] leading-snug">
      {tarea.titulo}
      </div>
      <div className="flex justify-between gap-3 mt-1 text-xs font-normal text-[var(--color-text-muted)]">
        <span className="truncate">{tarea.proyecto?.nombre || ''}</span>
        {hora ? (
          <span className="shrink-0 inline-flex items-center gap-1 font-medium text-[var(--color-text-dim)]">
            <Clock size={11} /> {hora}
          </span>
              ) : (
          tarea.venceEn && (
            <span className="shrink-0">
              {new Date(tarea.venceEn).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
            </span>
          )
        )}
      </div>
    </button>
  );
};

// Columna con encabezado fijo y lista con scroll propio. Llena el alto que le
// den: dentro del panel de vistas todas las columnas miden lo mismo.
const ActivityBucket = ({ label, count, icon, color, children }) => (
  <div style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 500, color }}>
        {icon}
        {label}
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 500, color }}>{count}</span>
    </div>
    <div style={{ flex: 1, minHeight: '48px', overflowY: 'auto', paddingRight: '0.3rem' }}>{children}</div>
  </div>
);

/** 'YYYY-MM-DD' del día de hoy en hora local, para el selector de fecha. */
const claveDiaLocal = (fecha = new Date()) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Seis por página: es lo que cabe en el panel de vistas sin obligar a desplazar
// dentro del gantt (6 × 84px de fila + cabecera y pie).
const PROYECTOS_POR_PAGINA = 6;

const ProjectTimeline = ({ projectEntries, selectedProjectId, onSelectProject }) => {
  const { t, locale } = usePreferences();
  const [escala, setEscala] = useState('mes');
  const [pagina, setPagina] = useState(1);

  const todos = projectEntries.filter((entry) => entry.start && entry.end);
  // Al elegir un proyecto se muestra solo ese; el boton "ver todos" lo devuelve.
  const filtrados = selectedProjectId
    ? todos.filter((entry) => entry.project.id === selectedProjectId)
    : todos;

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PROYECTOS_POR_PAGINA));
  // Se recorta en vez de reiniciar con un efecto: al filtrar a un solo proyecto
  // totalPaginas baja a 1 y esto ya deja la pagina en rango por si solo.
  const paginaActual = Math.min(pagina, totalPaginas);
  const validEntries = filtrados.slice(
    (paginaActual - 1) * PROYECTOS_POR_PAGINA,
    paginaActual * PROYECTOS_POR_PAGINA,
  );

  // El eje se calcula sobre TODOS los filtrados, no sobre la pagina visible:
  // si dependiera de la pagina, cada una tendria un rango de fechas distinto y
  // las barras "saltarian" al pasar de pagina.
  const range = (() => {
    if (!filtrados.length) {
      const start = new Date();
      return { start, end: new Date(start.getTime() + (14 * 24 * 60 * 60 * 1000)) };
    }
    return {
      start: new Date(Math.min(...filtrados.map((entry) => entry.start.getTime()))),
      end: new Date(Math.max(...filtrados.map((entry) => entry.end.getTime())))
    };
  })();

  const totalDays = Math.max(1, Math.ceil((endOfDay(range.end) - startOfDay(range.start)) / (1000 * 60 * 60 * 24)));

  // Ancho en pixeles (antes eran porcentajes). Con pixeles la escala puede
  // cambiar la densidad y el area se desplaza en horizontal si no cabe.
  const pxPorDia = ESCALAS_TIMELINE[escala].pxPorDia;
  const anchoTotal = Math.max(560, Math.round(totalDays * pxPorDia));

  // Sin useMemo: son un puñado de meses y depende de valores derivados que el
  // compilador de React no puede memorizar de forma fiable.
  const months = (() => {
    const items = [];
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

    while (cursor <= endMonth) {
      const monthStart = new Date(cursor);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const visibleStart = monthStart < range.start ? range.start : monthStart;
      const visibleEnd = monthEnd > range.end ? range.end : monthEnd;
      const days = Math.max(1, Math.ceil((endOfDay(visibleEnd) - startOfDay(visibleStart)) / (1000 * 60 * 60 * 24)));
      const ancho = Math.round((days / totalDays) * anchoTotal);

      items.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        // Con poco espacio se abrevia el mes, para que no se corte a la mitad
        label: capitalizar(cursor.toLocaleDateString(locale, ancho < 110
          ? { month: 'short' }
          : { month: 'long', year: 'numeric' })),
        ancho
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }
    return items;
  })();

  const getPx = (date) => ((startOfDay(date) - startOfDay(range.start)) / (1000 * 60 * 60 * 24) / totalDays) * anchoTotal;
  const todayPx = getPx(new Date());
  const hoyVisible = todayPx >= 0 && todayPx <= anchoTotal;

  const proyectoSeleccionado = selectedProjectId
    ? todos.find((entry) => entry.project.id === selectedProjectId)
    : null;

  if (!todos.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '20px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
        {t('timelineEmpty')}
      </div>
    );
  }

  return (
    // Se ajusta al alto que le den: barra de control arriba y paginacion abajo
    // siempre visibles, y las filas desplazan en medio. Antes crecia libre y la
    // paginacion quedaba fuera del panel, sin nada que avisara que seguia ahi.
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, border: '1px solid var(--color-border)', borderRadius: '20px', overflow: 'hidden', background: 'var(--color-surface)' }}>
      {/* Barra de control: proyecto y escala juntos, con la etiqueta arriba */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-dim)' }}>
              <FolderKanban size={14} color="#2563eb" />
                  {t('projects')}
            </span>
            <Select
              value={selectedProjectId === null ? 'TODOS' : String(selectedProjectId)}
              onValueChange={(valor) => onSelectProject(valor === 'TODOS' ? null : Number(valor))}
            >
              <SelectTrigger className="h-9 w-[240px] text-sm font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1500] max-h-[320px]">
                <SelectItem value="TODOS" className="text-sm font-normal">{t('dashboardAllProjects')}</SelectItem>
                {todos.map((entry) => (
                  <SelectItem key={entry.project.id} value={String(entry.project.id)} className="text-sm font-normal">
                    {entry.project.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-dim)' }}>
          <Layers size={14} color="#2563eb" />
              {t('timelineScale')}
            </span>
            <Select value={escala} onValueChange={setEscala}>
              <SelectTrigger className="h-9 w-[150px] text-sm font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1500]">
                {Object.entries(ESCALAS_TIMELINE).map(([clave, conf]) => (
                  <SelectItem key={clave} value={clave} className="text-sm font-normal">{t(conf.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
          {proyectoSeleccionado ? (
            <Button variant="ghost" size="sm" onClick={() => onSelectProject(null)} className="text-blue-600">
              <X size={14} /> {t('timelineShowAll')}
            </Button>
              ) : (
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#2563eb', background: 'rgba(37,99,235,0.10)', padding: '0.32rem 0.55rem', borderRadius: '999px' }}>
              {t('timelineVisibleCount', { count: validEntries.length })}
            </span>
          )}
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#ef4444', background: 'rgba(239,68,68,0.10)', padding: '0.32rem 0.55rem', borderRadius: '999px' }}>
            {t('timelineTodayLine')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)', background: 'var(--color-surface-3)', padding: '0.32rem 0.55rem', borderRadius: '999px' }}>
            <span style={{ width: '18px', height: '9px', borderRadius: '999px', background: 'repeating-linear-gradient(45deg, var(--color-text-muted) 0 3px, transparent 3px 6px)' }} />
            {t('timelineEstimated')}
          </span>
        </div>
      </div>

      {/* El desplazamiento vertical vive aqui, no en cada columna, para que los
          nombres y las barras se muevan juntos. La columna de la derecha solo
          desplaza en horizontal (overflowY hidden), si no crearia su propio
          scroll vertical y las dos columnas se desincronizarian. */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ width: '240px', minWidth: '240px', borderRight: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-3)', fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                  {t('projects')}
          </div>
        {validEntries.map((entry, index) => {
          const palette = getProjectTimelineColor(entry.project);
          const statusConf = getEstadoProyecto(entry.project.estado);
          const progress = entry.project.progresoGeneral ?? entry.project.progreso ?? 0;
          const selected = selectedProjectId === entry.project.id;
          const miembros = entry.project.miembros || [];

            return (
              <button
              key={entry.project.id}
                type="button"
                onClick={() => onSelectProject(selected ? null : entry.project.id)}
                style={{
                  width: '100%', height: '84px', padding: '0.9rem 1.25rem',
                  border: 'none',
                borderBottom: index < validEntries.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                background: selected ? 'rgba(37,99,235,0.10)' : 'var(--color-surface)',
                  cursor: 'pointer', textAlign: 'left', position: 'relative',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.35rem'
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: palette.solid }} />
                <div style={{ fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.project.nombre}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.3rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: statusConf.color, background: statusConf.bg, padding: '0.2rem 0.42rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                    {t(statusConf.labelKey)}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: palette.solid, background: palette.soft, padding: '0.2rem 0.42rem', borderRadius: '999px' }}>
                    {progress}%
                    </span>
                  </div>

                  {/* Miembros. Se usa UserAvatar para que salga la foto de perfil:
                      antes esta lista dibujaba la inicial a mano. */}
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {miembros.slice(0, 3).map((miembro) => (
                      <div key={miembro.id} style={{ marginRight: '-7px' }}>
                        <UserAvatar
                          usuario={miembro}
                          size={22}
                          radius={999}
                          fontSize="0.55rem"
                          color={palette.solid}
                          background="var(--color-surface)"
                          borderColor={palette.soft}
                />
                      </div>
                    ))}
                    {miembros.length > 3 && (
                      <span style={{ marginLeft: '0.55rem', fontSize: '0.7rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                        +{miembros.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ width: `${anchoTotal}px`, position: 'relative' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-3)' }}>
          {months.map((month) => (
                <div key={month.key} style={{ width: `${month.ancho}px`, minWidth: `${month.ancho}px`, padding: '1rem 0.6rem', borderRight: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 500, color: '#2563eb', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {month.label}
                </div>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              {hoyVisible && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${todayPx}px`, width: '2px', background: 'rgba(239,68,68,0.9)', zIndex: 8, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', top: '6px', left: '-5px', width: '12px', height: '12px', borderRadius: '999px', background: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.14)' }} />
                </div>
              )}

        {validEntries.map((entry, index) => {
                const left = getPx(entry.start);
                // Ancho minimo para que la barra siga siendo visible y clickeable
                const ancho = Math.max(26, getPx(entry.end) - left);
          const selected = selectedProjectId === entry.project.id;
          const progress = entry.project.progresoGeneral ?? entry.project.progreso ?? 0;
          const palette = getProjectTimelineColor(entry.project);
                const fechas = `${entry.start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} – ${entry.end.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}`;
                const esEstimada = entry.origenFin === 'estimada';
                const notaFin = esEstimada
                  ? t('timelineEstimatedShort')
                  : entry.origenFin === 'deducida'
                    ? t('timelineDerivedShort')
                    : '';
                // La etiqueta va donde quepa. Con barras anchas no hay hueco a
                // ningun lado, asi que se dibuja dentro de la propia barra.
                const anchoEtiqueta = 190;
                const posicionEtiqueta = left + ancho + anchoEtiqueta < anchoTotal
                  ? 'despues'
                  : left > anchoEtiqueta
                    ? 'antes'
                    : 'dentro';

                return (
                  <div
              key={entry.project.id}
                    onClick={() => onSelectProject(selected ? null : entry.project.id)}
                    style={{
                      height: '84px', position: 'relative', cursor: 'pointer',
                borderBottom: index < validEntries.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                      background: selected ? 'rgba(37,99,235,0.10)' : 'transparent'
                    }}
                  >
                    <div
                      title={`${entry.project.nombre} · ${fechas}${notaFin ? ` · ${notaFin}` : ''}`}
                      style={{
                        position: 'absolute', left: `${left}px`, width: `${ancho}px`,
                        top: '50%', transform: 'translateY(-50%)', height: '22px', borderRadius: '999px',
                        // Solo la fecha inventada se raya. La deducida del ultimo
                        // cierre es un dato real y se dibuja como cualquier otra.
                        background: esEstimada
                          ? `repeating-linear-gradient(45deg, ${palette.solid} 0 6px, ${palette.solid}66 6px 12px)`
                          : `${palette.solid}dd`,
                        boxShadow: selected ? `0 12px 24px ${palette.soft}` : `0 8px 18px ${palette.soft}`,
                        overflow: 'hidden'
                      }}
                    >
                      {!esEstimada && (
                  <div style={{ width: `${progress}%`, maxWidth: '100%', height: '100%', borderRadius: '999px', background: palette.accent, opacity: 0.92 }} />
                      )}
                    </div>
                    {/* Una sola etiqueta: antes habia una al inicio y otra al
                        final, y con barras cortas se encimaban. */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.72rem',
                        fontWeight: 400,
                        whiteSpace: 'nowrap',
                        ...(posicionEtiqueta === 'despues' && {
                          left: `${left + ancho + 10}px`,
                    color: 'var(--color-text-muted)',
                        }),
                        ...(posicionEtiqueta === 'antes' && {
                          left: `${left - anchoEtiqueta - 14}px`,
                          width: `${anchoEtiqueta}px`,
                          textAlign: 'right',
                    color: 'var(--color-text-muted)',
                        }),
                        // Dentro de la barra: el color del texto depende de que
                        // tan claro sea el color del proyecto. Sobre verde lima
                        // o amarillo, el blanco no se leia.
                        ...(posicionEtiqueta === 'dentro' && {
                          left: `${left + ancho - 12}px`,
                          transform: 'translate(-100%, -50%)',
                          color: textoLegibleSobre(palette.solid)
                        })
                      }}
                    >
                      {fechas}{notaFin ? ` · ${notaFin}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Paginacion entre proyectos. Se oculta al ver uno solo o si todos caben. */}
      {totalPaginas > 1 && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '0.85rem 1.1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-3)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
            {t('timelineRange', {
              desde: (paginaActual - 1) * PROYECTOS_POR_PAGINA + 1,
              hasta: Math.min(paginaActual * PROYECTOS_POR_PAGINA, filtrados.length),
              total: filtrados.length
            })}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tooltip label={t('previous')}>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1}>
                <ChevronLeft size={16} />
              </Button>
            </Tooltip>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text)', minWidth: '78px', textAlign: 'center' }}>
              {paginaActual} / {totalPaginas}
            </span>
            <Tooltip label={t('next')}>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>
                <ChevronRight size={16} />
              </Button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
};

// Cuantas actividades se cerraron en cada mes. Los datos vienen ya agrupados
// del servidor (stats.actividadPorMes), no se calculan aqui.
const ActividadPorMes = ({ datos }) => {
  const { t, locale } = usePreferences();
  const meses = datos?.meses || [];
  const sinFecha = datos?.sinFecha || 0;

  const maximo = Math.max(1, ...meses.map((m) => m.total));
  const total = meses.reduce((suma, m) => suma + m.total, 0);

  const nombreMes = (clave) => {
    const [anio, mes] = clave.split('-').map(Number);
    return capitalizar(new Date(anio, mes - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' }}>{t('monthlyActivityTitle')}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '0.2rem' }}>
            {t('monthlyActivitySubtitle')}
          </p>
        </div>
        {total > 0 && (
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#2563eb', background: 'rgba(37,99,235,0.10)', padding: '0.32rem 0.6rem', borderRadius: '999px' }}>
            {t('monthlyActivityTotal', { count: total })}
          </span>
        )}
      </div>

      {meses.length === 0 ? (
        <div style={{ padding: '2.5rem', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: '16px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
          {t('monthlyActivityEmpty')}
        </div>
              ) : (
        <div className="min-h-0 flex-1 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {meses.map((m) => {
            const pct = Math.round((m.total / maximo) * 100);
            return (
              <div key={m.mes} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '150px', minWidth: '150px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-dim)' }}>
                  {nombreMes(m.mes)}
                </div>
                <div style={{ flex: 1, height: '26px', background: 'var(--color-surface-3)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      minWidth: m.total > 0 ? '30px' : 0,
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
                      transition: 'width 0.5s ease'
                    }}
                />
                </div>
                <div style={{ width: '52px', textAlign: 'right', fontSize: '1rem', fontWeight: 500, color: 'var(--color-text)' }}>
                  {m.total}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Las terminadas sin fecha de cierre no se pueden ubicar en un mes; se
          avisa en vez de repartirlas o inventarles una fecha. */}
      {sinFecha > 0 && (
        <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', fontWeight: 400, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertCircle size={13} />
          {t('monthlyActivityNoDate', { count: sinFecha })}
        </p>
      )}
    </div>
  );
};


/**
 * Pestañas del panel de actividad. Las tres primeras miran un día concreto;
 * "General" ignora la fecha y muestra todo lo acumulado de cada persona.
 */
const VISTAS_ACTIVIDAD = [
  { id: 'hechas', campo: 'hechasHoy', labelKey: 'dashboardViewDone', vacioKey: 'dashboardCompletedToday' },
  { id: 'manana', campo: 'faltanManana', labelKey: 'dashboardViewTomorrow', vacioKey: 'dashboardNoDueTomorrow' },
  { id: 'semana', campo: 'faltanSemana', labelKey: 'dashboardViewWeek', vacioKey: 'dashboardNoDueWeek' },
  { id: 'general', campo: null, labelKey: 'dashboardViewGeneral', vacioKey: null },
];

/**
 * Columnas de la vista general, por estado de la tarea.
 *
 * Ya no hay columna de "faltan esta semana": para eso está la pestaña
 * "Esta semana", y repetirla aquí era la misma información dos veces.
 */
const COLUMNAS_GENERAL = [
  { estado: 'PENDIENTE', labelKey: 'dashboardStatusPending', vacioKey: 'dashboardNoPending', color: '#dc2626', icono: <Clock size={15} /> },
  { estado: 'EN_PROGRESO', labelKey: 'dashboardDoing', vacioKey: 'dashboardNoCurrent', color: '#2563eb', icono: <PlayCircle size={15} /> },
  { estado: 'HECHO', labelKey: 'dashboardStatusDone', vacioKey: 'dashboardNoDone', color: '#16a34a', icono: <CheckCircle2 size={15} /> },
];

/** Fila de tarea del detalle: qué se hizo, de qué proyecto y a qué hora. */
const FilaTareaDetalle = ({ tarea, onOpen, mostrarHora }) => {
  const { locale } = usePreferences();
  const hora = mostrarHora && tarea.completadoEn
    ? new Date(tarea.completadoEn).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : null;
  const vence = !mostrarHora && tarea.venceEn
    ? new Date(tarea.venceEn).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
    : null;

  return (
    <button
      type="button"
    onClick={() => onOpen?.(tarea)}
      className="w-full text-left flex items-start justify-between gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-[var(--color-surface-3)]"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--color-text)] leading-snug">
      {tarea.titulo}
        </span>
        <span className="block text-xs font-normal text-[var(--color-text-muted)] mt-0.5 truncate">
          {tarea.proyecto?.nombre || '—'}
        </span>
      </span>
      {(hora || vence) && (
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-dim)] pt-0.5">
          <Clock size={11} /> {hora || vence}
        </span>
      )}
    </button>
  );
};

const AdminMemberActivity = ({ miembros, onOpenTask, fecha, onFechaChange, cargando }) => {
  const { t, locale } = usePreferences();
  const [vista, setVista] = useState('hechas');
  const [busqueda, setBusqueda] = useState('');
  const [proyectoId, setProyectoId] = useState(null);
  const [seleccionadoId, setSeleccionadoId] = useState(null);

  const hoy = claveDiaLocal();
  const esHoy = fecha === hoy;

  const vistaActual = VISTAS_ACTIVIDAD.find((v) => v.id === vista) || VISTAS_ACTIVIDAD[0];
  const campoVista = vistaActual.campo;
  const esGeneral = vista === 'general';

  const lista = miembros || [];

  // El catálogo del filtro sale de las tareas y no de la lista de proyectos del
  // tablero: así solo aparecen proyectos donde alguien tiene algo asignado.
  const proyectos = (() => {
    const mapa = new Map();
    lista.forEach((miembro) => (miembro.todasConFecha || []).forEach((tarea) => {
      if (tarea.proyecto?.id && !mapa.has(tarea.proyecto.id)) {
        mapa.set(tarea.proyecto.id, tarea.proyecto.nombre);
      }
      }));
    return [...mapa]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
  })();

  const porProyecto = (tareas) => (
    proyectoId ? (tareas || []).filter((tarea) => tarea.proyecto?.id === proyectoId) : (tareas || [])
  );

  const termino = busqueda.trim().toLowerCase();

  // En "General" cuenta todo lo acumulado de la persona; en las de fecha, solo
  // el bloque del día. El filtro de proyecto se aplica en los dos casos.
  const tareasDe = (miembro) => porProyecto(esGeneral ? miembro.todasConFecha : miembro[campoVista]);
  const contar = (miembro) => tareasDe(miembro).length;

  // Primero quien tiene actividad, de más a menos, y quien no tiene nada al
  // final. Al empatar manda el nombre, así que a primera hora del día —cuando
  // todos van en cero— la lista sale en orden alfabético por sí sola.
  const visibles = lista
    .filter((miembro) => !termino || String(miembro.nombre || '').toLowerCase().includes(termino))
    .map((miembro) => ({ miembro, total: contar(miembro) }))
    .sort((a, b) => (
      b.total - a.total
      || String(a.miembro.nombre || '').localeCompare(String(b.miembro.nombre || ''), locale, { sensitivity: 'base' })
    ))
    .map((fila) => fila.miembro);

  // Se deriva en vez de guardarlo en un efecto: si la persona elegida sale del
  // filtro, cambia el día o cambia el proyecto, cae sola en la primera con tareas.
  const seleccionado = visibles.find((miembro) => miembro.id === seleccionadoId)
    || visibles.find((miembro) => contar(miembro) > 0)
    || visibles[0]
    || null;

  const tareasDetalle = seleccionado ? tareasDe(seleccionado) : [];

  // El reporte del día sale de la lista completa —el buscador solo sirve para
  // ubicar a alguien en pantalla—, pero sí respeta el filtro de proyecto, que
  // es un recorte real. Solo entra quien cerró al menos una tarea ese día, y de
  // esa gente se lleva también lo que dejó en curso.
  const filasReporte = lista
    .map((miembro) => ({
      miembro,
      hechas: porProyecto(miembro.hechasHoy),
      enProgreso: porProyecto(miembro.enProgreso),
    }))
    .filter((fila) => fila.hechas.length > 0)
    .sort((a, b) => (
      b.hechas.length - a.hechas.length
      || String(a.miembro.nombre || '').localeCompare(String(b.miembro.nombre || ''), locale, { sensitivity: 'base' })
    ));

  const puedeExportar = filasReporte.length > 0;
  const proyectoFiltrado = proyectos.find((proyecto) => proyecto.id === proyectoId) || null;

  const exportarPDF = () => {
    imprimirReporteDia({
      locale,
      filas: filasReporte,
      textos: {
        titulo: t('reportDayTitle'),
        fechaLegible: capitalizar(new Date(`${fecha}T12:00:00`).toLocaleDateString(locale, {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })),
        filtroProyecto: proyectoFiltrado
          ? t('reportDayFilterProject', { proyecto: proyectoFiltrado.nombre })
          : '',
        tituloHechas: t('reportDayDone'),
        tituloEnCurso: t('reportDayInProgress'),
        // Sin variables a propósito: los {count}/{personas} los sustituye el
        // reporte, que es quien conoce los totales de cada bloque.
        conteoHechas: t('reportDayCountDone'),
        conteoEnCurso: t('reportDayCountInProgress'),
        vence: t('reportDayDue'),
        pie: t('reportDaySummary'),
        generado: t('reportDayGenerated'),
        vacio: t('dashboardExportEmpty'),
        areas: Object.fromEntries(
          Object.entries(AREA_CONF).map(([clave, conf]) => [clave, t(conf.labelKey)]),
        ),
      },
    });
  };

  const exportarExcel = () => statsService.descargarReporteDia(fecha, proyectoId);

  const moverDia = (dias) => {
    const d = new Date(`${fecha}T12:00:00`);
    d.setDate(d.getDate() + dias);
    onFechaChange(claveDiaLocal(d));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)]">{t('dashboardTeamActivity')}</h3>
          <p className="text-sm font-normal text-[var(--color-text-muted)] mt-0.5">{t('dashboardTeamActivityDesc')}</p>
        </div>

        {/* Selector de día. En "General" no se muestra: esa vista no es de un
            día concreto, así que dejarlo ahí solo confundiría. */}
        {!esGeneral && (
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--color-text-dim)]">{t('dashboardActivityDay')}</span>
              <div className="flex items-center gap-1">
                <Tooltip label={t('previous')}>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moverDia(-1)}>
                    <ChevronLeft size={16} />
                  </Button>
                </Tooltip>
                <input
                  type="date"
                  value={fecha}
                  max={hoy}
                  onChange={(e) => e.target.value && onFechaChange(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-[var(--color-surface-3)] border-0 text-sm font-normal text-[var(--color-text)] outline-none"
                />
                <Tooltip label={t('next')}>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moverDia(1)} disabled={esHoy}>
                    <ChevronRight size={16} />
                  </Button>
                </Tooltip>
              </div>
            </div>
            {!esHoy && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => onFechaChange(hoy)}>
                {t('dashboardToday')}
              </Button>
            )}

            {/* Reporte del día que se ve arriba. Se apaga cuando nadie terminó
                nada: un PDF en blanco no le sirve a nadie. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={cargando || !puedeExportar}
                  aria-label={puedeExportar ? t('dashboardExport') : t('dashboardExportEmpty')}
                >
                  <Download size={15} />
                  {t('dashboardExport')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[1500] min-w-[200px]">
                <DropdownMenuItem className="gap-2 font-medium" onSelect={exportarPDF}>
                  <FileText size={14} />
                  <span>{t('dashboardExportPdf')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 font-medium" onSelect={exportarExcel}>
                  <FileSpreadsheet size={14} />
                  <span>{t('dashboardExportExcel')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Pestañas a la izquierda, buscador al centro y filtro de proyecto a la
          derecha. El buscador ocupa el hueco sobrante para quedar centrado. */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs value={vista} onValueChange={setVista}>
          <TabsList>
            {VISTAS_ACTIVIDAD.map((v) => (
              <TabsTrigger key={v.id} value={v.id} className="text-sm font-normal data-[state=active]:font-medium">
                {t(v.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex-1 flex justify-center min-w-[200px]">
          <CampoFiltro label={t('search')}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
                <Search size={15} />
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('dashboardSearchMember')}
                aria-label={t('dashboardSearchMember')}
                className="h-9 w-[220px] pl-9 pr-3 rounded-lg bg-[var(--color-surface-3)] border-0 text-sm font-normal text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
            </div>
          </CampoFiltro>
        </div>

        <CampoFiltro label={t('dashboardProjectFilter')}>
          <Select
            value={proyectoId === null ? 'TODOS' : String(proyectoId)}
            onValueChange={(valor) => setProyectoId(valor === 'TODOS' ? null : Number(valor))}
          >
            <SelectTrigger className="h-9 w-[210px] text-sm font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1500] max-h-[320px]">
              <SelectItem value="TODOS" className="text-sm font-normal">{t('dashboardAllProjects')}</SelectItem>
              {proyectos.map((proyecto) => (
                <SelectItem key={proyecto.id} value={String(proyecto.id)} className="text-sm font-normal">
                  {proyecto.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CampoFiltro>
      </div>

      {cargando && (
        <p className="text-sm font-normal text-[var(--color-text-muted)] py-6">{t('loading')}</p>
      )}

      {!cargando && visibles.length === 0 && (
        <p className="py-10 text-center text-sm font-normal text-[var(--color-text-muted)]">
          {termino || esGeneral
            ? t('dashboardNoMembers')
            : t('dashboardNoActivityDay', {
              fecha: capitalizar(new Date(`${fecha}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }))
            })}
        </p>
      )}

      {/* Maestro-detalle, igual en las cuatro pestañas: personas a la izquierda,
          su actividad a la derecha. Lo único que cambia es el detalle. */}
      {!cargando && visibles.length > 0 && (
        <div className="grid flex-1 min-h-0 gap-5 lg:grid-cols-[280px_1fr]">
          <div className="min-h-0 overflow-y-auto pr-1">
            {visibles.map((miembro) => {
              const total = contar(miembro);
              const activo = seleccionado?.id === miembro.id;
              return (
                <button
                        key={miembro.id}
                  type="button"
                  onClick={() => setSeleccionadoId(miembro.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activo ? 'bg-[var(--color-surface-3)]' : 'hover:bg-[var(--color-surface-3)]'
                  }`}
                >
                  <UserAvatar
                    usuario={miembro}
                    size={30}
                    radius={999}
                    fontSize="0.7rem"
                    color="#2563eb"
                    background="rgba(37,99,235,0.10)"
                    borderColor="rgba(37,99,235,0.18)"
                />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[var(--color-text)] truncate">{miembro.nombre}</span>
                    <span className="block text-xs font-normal text-[var(--color-text-muted)] truncate">{getAreaLabel(miembro.area, t)}</span>
                  </span>
                  <span className={`shrink-0 text-sm tabular-nums ${
                    total > 0 ? 'font-semibold text-[var(--color-text)]' : 'font-normal text-[var(--color-text-muted)]'
                  }`}>
                    {total}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex min-h-0 min-w-0 flex-col rounded-xl bg-[var(--color-surface-3)] p-2">
            {seleccionado && (
              <div className="px-3 py-2 mb-1 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-[var(--color-text)] truncate">{seleccionado.nombre}</span>
                <span className="text-sm font-normal text-[var(--color-text-muted)] shrink-0">
                  {t('dashboardTaskCount', { count: tareasDetalle.length })}
                </span>
              </div>
            )}

            {esGeneral ? (
              // Tres columnas por estado. Cada una scrollea por su cuenta para
              // que una persona con 40 pendientes no estire las otras dos.
              <div className="grid flex-1 min-h-0 gap-4 px-3 pb-2 sm:grid-cols-3">
                {COLUMNAS_GENERAL.map((columna) => {
                  const deLaColumna = tareasDetalle.filter((tarea) => tarea.estado === columna.estado);
                  return (
                    <ActivityBucket
                      key={columna.estado}
                      label={t(columna.labelKey)}
                      count={deLaColumna.length}
                      color={columna.color}
                      icon={columna.icono}
                    >
                      {deLaColumna.length === 0 ? (
                        <span className="text-sm font-normal text-[var(--color-text-muted)]">{t(columna.vacioKey)}</span>
                      ) : deLaColumna.map((tarea) => (
                        <MiniTask
                  key={tarea.id}
                          tarea={tarea}
                          onOpen={onOpenTask}
                          mostrarHora={columna.estado === 'HECHO'}
                />
                      ))}
              </ActivityBucket>
                  );
                })}
              </div>
            ) : tareasDetalle.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm font-normal text-[var(--color-text-muted)]">
                {t(vistaActual.vacioKey)}
              </p>
              ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tareasDetalle.map((tarea) => (
                  <FilaTareaDetalle
                  key={tarea.id}
                    tarea={tarea}
                    onOpen={onOpenTask}
                    mostrarHora={vista === 'hechas'}
                />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PROYECTOS_POR_PAGINA_TABLA = 10;

/**
 * Progreso de proyectos en tabla.
 *
 * Por defecto oculta los terminados y archivados: la idea es ver lo que sigue
 * en marcha. El admin decide cuando un proyecto esta terminado desde su menu,
 * y a partir de ahi sale de esta lista salvo que se pida verlo con el filtro.
 */
const TablaProgresoProyectos = ({ proyectos, onAbrirProyecto }) => {
  const { t, locale } = usePreferences();
  const [filtro, setFiltro] = useState('EN_CURSO');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const FILTROS = [
    { valor: 'EN_CURSO', labelKey: 'dashboardFilterInProgress' },
    { valor: 'TODOS', labelKey: 'projectFilterAll' },
    ...ESTADOS_PROYECTO.map((e) => ({ valor: e.value, labelKey: e.labelKey })),
    ];

  // Aqui la busqueda es local: los proyectos ya vienen todos en las estadisticas,
  // no hace falta ir al servidor por cada letra.
  const termino = busqueda.trim().toLowerCase();
  const filtrados = proyectos.filter((p) => {
    const estado = normalizarEstadoProyecto(p.estado);
    const coincideEstado = filtro === 'EN_CURSO'
      ? estado !== 'TERMINADO' && estado !== 'ARCHIVADO'
      : filtro === 'TODOS' || estado === filtro;
    const coincideTexto = !termino || String(p.nombre || '').toLowerCase().includes(termino);
    return coincideEstado && coincideTexto;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PROYECTOS_POR_PAGINA_TABLA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice(
    (paginaActual - 1) * PROYECTOS_POR_PAGINA_TABLA,
    paginaActual * PROYECTOS_POR_PAGINA_TABLA,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{t('dashboardProjectProgress')}</h3>

        <div className="flex items-end gap-3 flex-wrap">
          <CampoFiltro label={t('search')}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
                <Search size={15} />
              </span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                placeholder={t('projectSearchPlaceholder')}
                aria-label={t('projectSearchPlaceholder')}
                className="h-9 w-[220px] pl-9 pr-3 rounded-lg bg-[var(--color-surface-3)] border-0 text-sm font-normal text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
            </div>
          </CampoFiltro>

          <CampoFiltro label={t('projectFieldStatus')}>
            <Select value={filtro} onValueChange={(v) => { setFiltro(v); setPagina(1); }}>
              <SelectTrigger className="h-9 w-[160px] text-sm font-normal border-0 bg-[var(--color-surface-3)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1500]">
                {FILTROS.map((f) => (
                  <SelectItem key={f.valor} value={f.valor} className="text-sm font-normal">
                    {t(f.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFiltro>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="py-12 text-center text-sm font-normal text-[var(--color-text-muted)]">
          {t('projectNoResultsTitle')}
        </div>
              ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium">{t('dashboardProjects')}</TableHead>
                <TableHead className="font-medium">{t('projectFieldStatus')}</TableHead>
                <TableHead className="font-medium w-[180px]">{t('dashboardProgress')}</TableHead>
                <TableHead className="font-medium text-right">{t('dashboardTasksLabel')}</TableHead>
                <TableHead className="font-medium text-right">{t('dashboardPending')}</TableHead>
                <TableHead className="font-medium text-right">{t('teamTitle')}</TableHead>
                <TableHead className="font-medium">{t('projectFieldStart')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((p) => {
                const estado = getEstadoProyecto(p.estado);
                const pct = p.porcentaje ?? 0;
                return (
                  <TableRow
                    key={p.id}
                    onClick={() => onAbrirProyecto(p.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium text-[var(--color-text)]">{p.nombre}</TableCell>
                    <TableCell>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap"
                        style={{ color: estado.color, background: estado.bg }}
                      >
                        {t(estado.labelKey)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--color-primary)]"
                            style={{ width: `${pct}%` }}
                />
                        </div>
                        <span className="text-xs font-medium text-[var(--color-text-dim)] w-9 text-right">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-normal">{p.totalTareas ?? 0}</TableCell>
                    <TableCell className="text-right font-normal">
                      <span className={p.pendientes > 0 ? 'text-red-600 font-medium' : ''}>
                        {p.pendientes ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-normal">{p.miembros ?? 0}</TableCell>
                    <TableCell className="font-normal text-[var(--color-text-muted)] whitespace-nowrap">
                      {p.fechaInicio
                        ? new Date(p.fechaInicio).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' })
                        : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPaginas > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2 border-t border-[var(--color-border)]">
          <span className="text-sm font-normal text-[var(--color-text-muted)]">
            {t('timelineRange', {
              desde: (paginaActual - 1) * PROYECTOS_POR_PAGINA_TABLA + 1,
              hasta: Math.min(paginaActual * PROYECTOS_POR_PAGINA_TABLA, filtrados.length),
              total: filtrados.length
            })}
          </span>
          <div className="flex items-center gap-2">
            <Tooltip label={t('previous')}>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPagina((n) => Math.max(1, n - 1))} disabled={paginaActual === 1}>
                <ChevronLeft size={16} />
              </Button>
            </Tooltip>
            <span className="text-sm font-medium text-[var(--color-text)] min-w-[70px] text-center">
              {paginaActual} / {totalPaginas}
            </span>
            <Tooltip label={t('next')}>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))} disabled={paginaActual === totalPaginas}>
                <ChevronRight size={16} />
              </Button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardMiembro = ({ usuario }) => {
  const { t, locale } = usePreferences();
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [todasTareas, setTodas] = useState([]);
  const [resumenTareas, setResumenTareas] = useState({ total: 0, hechas: 0, pendientes: 0, enProgreso: 0 });
  const [cargando, setCargando] = useState(true);
  const area = AREA_CONF[usuario?.area] || { color: 'var(--color-text-muted)', bg: 'rgba(148,163,184,0.1)', icon: <User size={18} />, labelKey: 'areaGeneral' };

  useEffect(() => {
    const cargar = async () => {
      try {
        const data = await statsService.getMemberStats();
        setProyectos(data.proyectos || []);
        setTodas(data.tareas || []);
        setResumenTareas(data.resumenTareas || { total: 0, hechas: 0, pendientes: 0, enProgreso: 0 });
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
  const tareasRestantes = Math.max((resumenTareas.total || 0) - (resumenTareas.hechas || 0), 0);
  const proximas = [...pendientes, ...enProgreso]
    .filter((t) => t.venceEn)
    .sort((a, b) => new Date(a.venceEn) - new Date(b.venceEn))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <div
          className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl shrink-0 flex items-center justify-center font-medium text-lg lg:text-xl shadow-xl shadow-slate-200/50"
          style={{ background: area.bg, border: `2px solid ${area.color}`, color: area.color }}
        >
          {usuario?.nombre?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl lg:text-3xl font-semibold tracking-tight text-slate-900 leading-tight">
            {saludo(t)}, {usuario?.nombre?.split(' ')[0]}
          </h1>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-[10px] font-medium text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
              {t(area.labelKey)}
            </span>
            <span className="text-[10px] font-medium text-blue-600 px-2 py-0.5 bg-blue-50 rounded-md border border-blue-100">
              {t('statusActive')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap mb-8">
        <StatCard primero value={proyectos.length} icon={<IconProjects />} color="#2563eb" sub={t('dashboardProjects')} onClick={() => navigate('/proyectos')} />
        <StatCard value={resumenTareas.total} icon={<IconTasks />} color="var(--color-text-dim)" sub={t('dashboardTasksLabel')} onClick={() => navigate('/proyectos')} />
        <StatCard value={resumenTareas.hechas} icon={<IconCheck />} color="#10b981" sub={t('dashboardDone')} onClick={() => navigate('/agenda')} />
        <StatCard value={tareasRestantes} icon={<AlertCircle size={16} strokeWidth={2} />} color="#dc2626" sub={t('dashboardPending')} onClick={() => navigate('/proyectos')} />
        <StatCard value={enProgreso.length} icon={<PlayCircle size={16} strokeWidth={2} />} color="#8b5cf6" sub={t('dashboardInProgress')} onClick={() => navigate('/proyectos')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>{t('dashboardMyProjects')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {proyectos.map((p) => (
              <button key={p.id} type="button" onClick={() => navigate(`/proyectos/${p.id}`)} className="card" style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', textAlign: 'left' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{p.nombre}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{p._count?.tareas || 0} {t('taskAssignedPlural')}</div>
                </div>
                <span style={{ color: 'var(--color-primary)', display: 'flex' }}><ArrowRight size={20} /></span>
              </button>
            ))}
          </div>
        </div>

        {proximas.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>{t('dashboardUpcoming')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {proximas.map((tarea) => (
                <button
                  key={tarea.id}
                  type="button"
                  onClick={() => navigate(`/proyectos/${tarea.proyectoId || tarea.proyecto?.id}`)}
                  style={{ background: 'var(--color-surface-2)', padding: '1rem', borderRadius: '0.85rem', border: '1px solid var(--color-border)', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{tarea.titulo}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={10} /> {new Date(tarea.venceEn).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {t({ ALTA: 'priorityHigh', MEDIA: 'priorityMedium', BAJA: 'priorityLow' }[tarea.prioridad] || 'priorityMedium')}
                    </span>
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


/**
 * Vistas del panel del Inicio. Solo se muestra una a la vez; el orden es el que
 * pidió el usuario y "actividad" es la de arranque porque es lo que revisa a diario.
 */
const VISTAS_PANEL = [
  { id: 'actividad', labelKey: 'dashboardPanelActivity' },
  { id: 'gantt', labelKey: 'dashboardPanelGantt' },
  { id: 'progreso', labelKey: 'dashboardPanelProgress' },
  { id: 'mes', labelKey: 'dashboardPanelMonthly' },
];

// Alto único del panel, para que cambiar de vista no mueva nada de lugar.
// Calibrado para que en la vista de actividad quepan ~10 personas sin
// desplazar. El tope de arriba deja ver la página completa en monitores altos;
// en pantallas normales el panel ocupa casi todo y la página sí desplaza, que
// es lo que pidió el usuario.
const ALTO_PANEL_INICIO = 'clamp(600px, calc(100vh - 72px), 1000px)';

const DashboardAdmin = () => {
  const { t, locale } = usePreferences();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [vistaPanel, setVistaPanel] = useState('actividad');

  // Actividad del equipo por día. Va por su propia clave para que cambiar de
  // fecha no obligue a recalcular todas las estadísticas, y para que volver a
  // un día ya consultado sea inmediato.
  const [fechaActividad, setFechaActividad] = useState(() => claveDiaLocal());

  const { data: actividadRespuesta, isLoading: cargandoActividad } = useSWR(
    ['actividad-equipo', fechaActividad],
    async ([, fecha]) => statsService.actividadEquipo(fecha),
    { onError: (error) => showToast?.(error.message, 'error') },
  );
  const actividadDia = actividadRespuesta?.miembros ?? null;

  // El tablero completo (estadísticas + proyectos del gantt) también por SWR:
  // es la pantalla de entrada y la más pesada, y antes volvía a pedirlo todo
  // cada vez que se entraba, con el esqueleto de carga en blanco.
  const { data: tablero, isLoading: cargando, mutate: recargarTablero } = useSWR(
    'dashboard-admin',
    async () => {
      const [statsData, projectsData] = await Promise.all([
        statsService.getAdminStats(),
        proyectosService.listar(),
      ]);
      return { stats: statsData, projects: projectsData.proyectos || [] };
    },
    { onError: (error) => showToast?.(error.message || 'No se pudo actualizar el dashboard', 'error') },
  );

  const stats = tablero?.stats || null;
  // Memorizado: `|| []` crearia un array nuevo en cada render y eso invalidaria
  // los useMemo del gantt aunque los datos no hubieran cambiado.
  const projects = useMemo(() => tablero?.projects || [], [tablero]);

  const cargarDashboard = useCallback(() => { recargarTablero(); }, [recargarTablero]);

  useEffect(() => {
    let timeoutId = null;
    const handleScheduleChanged = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void cargarDashboard();
      }, 150);
    };

    window.addEventListener('crm:schedule-changed', handleScheduleChanged);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('crm:schedule-changed', handleScheduleChanged);
    };
  }, [cargarDashboard]);

  const openTaskProject = (task) => {
    const projectId = task?.proyecto?.id || task?.proyectoId || selectedProjectId;
    if (projectId) navigate(`/proyectos/${projectId}`);
  };

  const projectEntries = useMemo(() => (
    projects.map((project) => {
      const range = getProjectRange(project);
      return { project, start: range.start, end: range.end, origenFin: range.origenFin };
    })
  ), [projects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const { proyectos, tareas, proyectosProgreso, actividadMiembros, actividadPorMes } = stats || {};

  const globalDone = stats?.tareas?.estados?.find((estado) => estado.estado === 'HECHO')?._count || 0;
  const globalRemaining = Math.max((stats?.tareas?.total || 0) - globalDone, 0);
  // El esqueleto solo la primera vez: al volver ya hay datos en cache y se
  // pinta al instante mientras llega la version fresca.
  if (cargando && !stats) return <PageSkeleton cards={4} />;
  if (!stats) return <div style={{ padding: '4rem', textAlign: 'center' }}>{t('dashboardConnectionError')}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Titulo e indicadores en la misma franja: antes ocupaban casi 300px de
          alto entre los dos, antes de llegar al contenido. */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-semibold text-[var(--color-text)] tracking-tight leading-tight">
            {t('dashboardAdminTitle')}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] font-normal mt-0.5">
            {t('dashboardAdminSubtitle')} · {capitalizar(new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }))}
          </p>
        </div>

        {/* Solo proyectos, tareas y pendientes; en una linea, valor y etiqueta juntos */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          <StatCard primero value={proyectos.total} icon={<IconProjects />} color="#2563eb" sub={t('dashboardProjects')} onClick={() => navigate('/proyectos')} />
          <StatCard value={tareas.total} icon={<IconTasks />} color="var(--color-text-dim)" sub={t('dashboardTasksLabel')} onClick={() => navigate('/proyectos')} />
          <StatCard value={globalRemaining} icon={<AlertCircle size={16} strokeWidth={2} />} color="#dc2626" sub={t('dashboardPending')} onClick={() => navigate('/proyectos')} />
        </div>
      </div>

      {/* Un solo panel con las cuatro vistas. Antes iban las cuatro apiladas y
          había que bajar toda la página para llegar a la actividad, que es lo
          primero que el admin quiere ver. Ahora esa es la vista de arranque. */}
      <div className="card flex flex-col mb-8" style={{ height: ALTO_PANEL_INICIO }}>
        <div className="shrink-0 border-b border-[var(--color-border)] pb-3 mb-5">
          <Tabs value={vistaPanel} onValueChange={setVistaPanel}>
            <TabsList>
              {VISTAS_PANEL.map((v) => (
                <TabsTrigger key={v.id} value={v.id} className="text-sm font-normal data-[state=active]:font-medium">
                  {t(v.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Alto fijo e idéntico en las cuatro: la actividad se ajusta sola al
            panel y las otras tres desplazan aquí dentro si no caben. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {vistaPanel === 'actividad' && (
            <AdminMemberActivity
              miembros={actividadDia ?? actividadMiembros}
              fecha={fechaActividad}
              onFechaChange={setFechaActividad}
              cargando={cargandoActividad}
              onOpenTask={openTaskProject}
                />
          )}

          {vistaPanel === 'gantt' && (
            <div className="flex h-full min-h-0 flex-col">
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.3rem' }}>{t('dashboardProjectGantt')}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                {selectedProject ? t('dashboardFocusedView', { project: selectedProject.nombre }) : t('dashboardGlobalView')}
                  </p>
                </div>
                <Button
                  size="sm"
                onClick={() => navigate(selectedProject ? `/proyectos/${selectedProject.id}` : '/proyectos')}
                >
                {selectedProject ? t('dashboardOpenProject') : t('dashboardViewBoard')}
                </Button>
              </div>

              {/* El selector de proyecto vive dentro de ProjectTimeline, junto al
                  de escala. El gantt ya no se minimiza: siempre esta visible. */}
              <ProjectTimeline projectEntries={projectEntries} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />
            </div>
          )}

          {vistaPanel === 'progreso' && (
            <TablaProgresoProyectos proyectos={proyectosProgreso || []} onAbrirProyecto={(id) => navigate(`/proyectos/${id}`)} />
          )}

          {vistaPanel === 'mes' && <ActividadPorMes datos={actividadPorMes} />}
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
