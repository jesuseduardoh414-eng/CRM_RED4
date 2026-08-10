// Página de detalle de un Proyecto
// Muestra info del proyecto, barra de progreso, contadores y lista de tareas
// Vistas: Lista | Kanban | Gantt | Muro

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { proyectosService, tareasService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import Tooltip from '../components/Tooltip';
import ActionMenu from '../components/ActionMenu';
import SelectorMultiple from '../components/SelectorMultiple';
import SelectorRangoFechas from '../components/SelectorRangoFechas';
import FiltrosTareas from '../components/FiltrosTareas';
import KanbanView from '../components/KanbanView';
import GanttView  from '../components/GanttView';
import { PageSkeleton } from '../components/Skeleton';
import ModalImportar from '../components/ModalImportar';
import TaskAttachments from '../components/TaskAttachments';
import TaskComments from '../components/TaskComments';
import { sortTareas, sortTareasLista } from '../utils/sorters';
import { getEstadoProyecto, estaListoParaRevision } from '../utils/estadosProyecto';
import { 
  ArrowRight, 
  RotateCcw, 
  Trash2, 
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Save,
  FileJson,
  FileSpreadsheet,
  List,
  LayoutGrid,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Search,
  User2,
  Archive,
  ArchiveRestore,
  BadgeCheck,
  CheckSquare,
  X
} from 'lucide-react';

// ── Configuraciones ─────────────────────────────────────────────────────────
const PRIORIDADES = [
  { value: 'BAJA',  labelKey: 'priorityLow',    color: '#00a2ff', bg: 'rgba(0,162,255,0.1)' },
  { value: 'MEDIA', labelKey: 'priorityMedium', color: '#ff9100', bg: 'rgba(255,145,0,0.1)' },
  { value: 'ALTA',  labelKey: 'priorityHigh',   color: '#ff0055', bg: 'rgba(255,0,85,0.1)' },
];

const ESTADOS_TAREA = [
  { value: 'PENDIENTE',   labelKey: 'statusTodo',       color: '#6c757d' },
  { value: 'EN_PROGRESO', labelKey: 'statusInProgress', color: '#00a2ff' },
  { value: 'HECHO',       labelKey: 'statusDone',       color: '#00d166' },
];

// 10 por pagina, lo mismo que mostraba el antiguo "Ver mas tareas" por tanda.
const TAREAS_POR_PAGINA = 10;

const getPrioridad  = (v) => PRIORIDADES.find(p => p.value === v) || PRIORIDADES[1];
const getEstadoConf = (v) => ESTADOS_TAREA.find(e => e.value === v) || ESTADOS_TAREA[0];

const getLocale = () => document.documentElement.lang === 'en' ? 'en-US' : 'es-MX';
const formatFecha = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(getLocale(), { day: '2-digit', month: 'short' });
};

const getDateAtNoon = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(12, 0, 0, 0);
  return date;
};

const inicioDiaLocal = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const esFechaVencida = (value) => (
  Boolean(value) && inicioDiaLocal(value) < inicioDiaLocal(new Date())
);

const getHoyMediodiaIso = () => {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  return hoy.toISOString();
};

const getVenceEnOptimista = (tarea, nuevoEstado) => {
  if (!tarea?.venceEn) return tarea?.venceEn;
  if (nuevoEstado === 'HECHO') return getHoyMediodiaIso();
  return esFechaVencida(tarea.venceEn)
    ? getHoyMediodiaIso()
    : tarea.venceEn;
};

const tareaCoincideConRango = (tarea, rango) => {
  if (!rango?.from && !rango?.to) return true;

  const fechaInicio = getDateAtNoon(tarea.fechaInicio);
  const fechaFin = getDateAtNoon(tarea.venceEn || tarea.fechaInicio);

  if (!fechaInicio && !fechaFin) return false;

  const inicio = fechaInicio || fechaFin;
  const fin = fechaFin || fechaInicio;
  const from = getDateAtNoon(rango.from);
  const to = getDateAtNoon(rango.to || rango.from);

  if (from && fin < from) return false;
  if (to && inicio > to) return false;

  return true;
};

const getTaskAssignees = (tarea) => {
  if (Array.isArray(tarea?.asignados) && tarea.asignados.length > 0) return tarea.asignados;
  return tarea?.asignado ? [tarea.asignado] : [];
};

const isTaskAssignedToUser = (tarea, usuarioId) => (
  getTaskAssignees(tarea).some((asignado) => asignado.id === usuarioId)
);

const getTaskAssigneeNames = (tarea, fallback) => {
  const nombres = getTaskAssignees(tarea).map((asignado) => asignado.nombre).filter(Boolean);
  return nombres.length > 0 ? nombres.join(', ') : fallback;
};

/**
 * Progreso en texto plano, sin tarjeta ni recuadro, igual que los indicadores
 * del Inicio. Antes era un numero suelto dentro de una caja con icono de fondo;
 * el usuario pidio el mismo tratamiento en las dos pantallas.
 */
const BarraProgreso = ({ etiqueta, porcentaje, detalle, color }) => (
  <div className="min-w-0 flex-1">
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-semibold leading-none tracking-tight" style={{ color }}>
        {porcentaje}%
      </span>
      <span className="text-sm font-medium text-[var(--color-text-dim)]">{etiqueta}</span>
      <span className="ml-auto text-xs font-normal text-[var(--color-text-muted)]">{detalle}</span>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${porcentaje}%`, background: color }}
      />
    </div>
  </div>
);

/**
 * Etiqueta de campo de formulario. Marca los opcionales, para no tener que
 * adivinar cuales hacen falta de verdad para guardar.
 */
const EtiquetaCampo = ({ texto, opcional = false }) => {
  const { t } = usePreferences();
  return (
    <label className="flex items-baseline gap-1.5 text-sm font-medium text-[var(--color-text-muted)]">
      {texto}
      {opcional && (
        <span className="text-xs font-normal text-[var(--color-text-muted)] opacity-70">
          · {t('fieldOptional')}
        </span>
      )}
    </label>
  );
};

// ── Tarjeta de Tarea (List View) ─────────────────────────────────────────────
const TareaCard = ({
  tarea,
  usuarioActual,
  onClick,
  onEliminar,
  onCambiarEstado,
  seleccionable = false,
  seleccionada = false,
  onAlternarSeleccion,
}) => {
  const { t } = usePreferences();
  const prio = getPrioridad(tarea.prioridad);
  const estado = getEstadoConf(tarea.estado);
  const CICLO = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];
  const sigEstado = CICLO[(CICLO.indexOf(tarea.estado) + 1) % CICLO.length];
  const vencido = esFechaVencida(tarea.venceEn) && tarea.estado !== 'HECHO';
  const asignados = getTaskAssignees(tarea);
  const creadorEsUsuarioActual = tarea.creador?.id === usuarioActual?.id
    || (!tarea.creador?.id && (asignados.length === 0 || isTaskAssignedToUser(tarea, usuarioActual?.id)));
  // Si la tarea la creaste tu, no se dice nada: ya lo sabes. Solo interesa
  // saber quien la asigno cuando fue otra persona.
  const asignadorLabel = creadorEsUsuarioActual
    ? null
    : `${t('taskAssignedBy')} ${tarea.creador?.nombre || t('taskCreatedBySystem')}`;
  const responsableLabel = isTaskAssignedToUser(tarea, usuarioActual?.id)
    ? t('taskAssignedToYou')
    : `${t('projectResponsible')}: ${getTaskAssigneeNames(tarea, t('taskUnassigned'))}`;

  return (
    <div
      onClick={() => (seleccionable ? onAlternarSeleccion?.(tarea.id) : onClick(tarea))}
      className={`bg-[var(--color-surface)] border p-4 lg:p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 transition-all cursor-pointer shadow-sm hover:shadow-md ${
        seleccionada
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/25'
          : 'border-[var(--color-border)] hover:translate-x-1'
      }`}
    >
      {/* Icono de Estado y Título */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* En modo seleccion la casilla sustituye al punto de estado: manda el
            estar marcada o no, y dos indicadores juntos se estorban. */}
        {seleccionable ? (
          <input
            type="checkbox"
            checked={seleccionada}
            onChange={() => onAlternarSeleccion?.(tarea.id)}
            onClick={(event) => event.stopPropagation()}
            aria-label={tarea.titulo}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-primary)]"
          />
        ) : (
          <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full shrink-0 mt-1.5"
            style={{ background: estado.color, boxShadow: `0 0 10px ${estado.color}55` }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className={`text-sm lg:text-base font-semibold text-[var(--color-text)] truncate ${tarea.estado === 'HECHO' ? 'line-through opacity-40' : ''}`}>
              {tarea.titulo}
            </h4>
            <span className="text-[9px] font-medium px-2 py-0.5 rounded-md" style={{ background: prio.bg, color: prio.color }}>
              {t(prio.labelKey)}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] truncate font-normal">
            {tarea.descripcion || t('taskNoDescription')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <User2 size={12} />
              {responsableLabel}
            </span>
            {asignadorLabel && (
              <>
                <span className="hidden text-[var(--color-border)] lg:inline">•</span>
                <span className="inline-flex items-center gap-1 text-[var(--color-text-dim)]">
                  {asignadorLabel}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-[var(--color-border-light)]">
        {/* Fecha */}
        <div className={`text-[10px] lg:text-xs font-medium shrink-0 flex items-center gap-1 ${vencido ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>
          {tarea.venceEn ? (
            <>
              {vencido && <AlertTriangle size={12} />}
              {formatFecha(tarea.venceEn)}
            </>
          ) : '-'}
        </div>

        {/* En modo seleccion se esconde: la accion la manda la barra de arriba,
            y dejar aqui un "Eliminar" que borra solo esta despista. */}
        <div className={`flex items-center gap-2 ml-4 ${seleccionable ? 'hidden' : ''}`}>
          <ActionMenu
            size={16}
            className="p-2 lg:p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-xl"
            items={[
              {
                label: tarea.estado === 'HECHO' ? t('taskReopen') : t('taskAdvanceStatus'),
                icon: tarea.estado === 'HECHO' ? <RotateCcw size={15} /> : <ArrowRight size={15} />,
                onSelect: () => onCambiarEstado(tarea.id, sigEstado),
              },
              { separator: true },
              { label: t('delete'), icon: <Trash2 size={15} />, onSelect: () => onEliminar(tarea), danger: true },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

// ── Toggle Vista (Material) ─────────────────────────────────────────────────
const ToggleVista = ({ vista, onChange, t }) => (
  <div className="flex bg-[var(--color-surface-3)] p-1 rounded-xl border border-[var(--color-border)] gap-1 w-full lg:w-auto">
    {[
      { k: 'lista',  l: t('projectList'), i: <List size={16} /> },
      { k: 'kanban', l: t('projectKanban'), i: <LayoutGrid size={16} /> },
      { k: 'gantt',  l: t('projectGantt'), i: <CalendarRange size={16} /> }
    ].map(v => (
      <button 
        key={v.k} onClick={() => onChange(v.k)}
        className={`
          flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all
          ${vista === v.k ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--color-text-dim)] hover:bg-[var(--color-surface)]'}
        `}
      >
        {v.i} <span className="hidden lg:inline">{v.l}</span>
      </button>
    ))}
  </div>
);

// ── Main Page Component ─────────────────────────────────────────────────────
const ProyectoDetallePage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { usuario } = useAuth();
  const { t } = usePreferences();
  const { showToast } = useToast();

  const [proyecto, setProyecto] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [modalExportar, setModalExportar] = useState(false);
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [tareaEditando, setTareaEditando] = useState(null);
  const [vista, setVista] = useState('lista');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  // Renombrado desde setPaginaLista en el render para dejar claro que la pagina
  // es solo de la vista de lista; el Kanban y el gantt tienen la suya.

  const [filtroPrioridad, setFiltroPrioridad] = useState('todas');
  const [filtroResponsable, setFiltroResponsable] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState({ from: null, to: null });

  // Borrado en bloque. El modo se activa a mano para que el uso normal —abrir
  // una tarea al pulsarla— no cambie sin querer.
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState(() => new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const t = await tareasService.listar(id);
      setProyecto(t.proyecto);
      setTareas(sortTareas(t.tareas));
      setUsuarios(t.proyecto?.miembros || []);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setCargando(false); }
  }, [id, showToast]);

  useEffect(() => { 
    const fetch = async () => {
      await cargar();
    };
    fetch();
  }, [cargar]);

  useEffect(() => {
    const tareaIdParam = searchParams.get('tarea');
    if (!tareaIdParam || !tareas.length) return;

    const tareaObjetivo = tareas.find((item) => String(item.id) === tareaIdParam);
    if (!tareaObjetivo) return;

    setTareaEditando(tareaObjetivo);
    setModal(true);
  }, [searchParams, tareas]);

  const cerrarModalTarea = useCallback(() => {
    setModal(false);
    setTareaEditando(null);

    if (searchParams.get('tarea')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tarea');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const stats = useMemo(() => {
    const hechas = tareas.filter(t => t.estado === 'HECHO').length;
    const prog = tareas.filter(t => t.estado === 'EN_PROGRESO').length;
    const pendientes = tareas.filter(t => t.estado === 'PENDIENTE').length;
    const total = tareas.length;
    const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;

    const tareasMiembro = tareas.filter((t) => isTaskAssignedToUser(t, usuario?.id));
    const hechasMiembro = tareasMiembro.filter(t => t.estado === 'HECHO').length;
    const pctMiembro = tareasMiembro.length > 0 ? Math.round((hechasMiembro / tareasMiembro.length) * 100) : 0;

    return {
      total,
      hechas,
      progreso: prog,
      pendientes,
      pct,
      totalMiembro: tareasMiembro.length,
      hechasMiembro,
      pctMiembro,
    };
  }, [tareas, usuario?.id]);

  const progresoGeneral = stats.pct;
  const estadoProyecto = getEstadoProyecto(proyecto?.estado);
  // El progreso se calcula aqui, asi que se arma el objeto que espera el helper
  const listoParaRevision = usuario?.rol === 'ADMIN' && estaListoParaRevision({
    estado: proyecto?.estado,
    progresoGeneral: stats.pct,
    _count: { tareas: stats.total },
  });
  const progresoMiembro = stats.pctMiembro;
  const totalGeneral = stats.total;
  const totalMiembro = stats.totalMiembro;

  // "Mi progreso" depende del rol:
  //  - Admin: solo si tiene tareas suyas aqui. Entra a supervisar proyectos que
  //    no trabaja, y ahi un 0% no significa nada.
  //  - Miembro: siempre, porque solo ve proyectos en los que participa y el 0%
  //    si le dice algo ("estoy dentro y no he tomado nada").
  const mostrarMiProgreso = usuario?.rol === 'ADMIN'
    ? totalMiembro > 0
    : Boolean(usuario?.id);

  const tareasFiltradas = useMemo(() => {
    if (!busqueda) return tareas;
    const b = busqueda.toLowerCase();
    return tareas.filter(t => 
      t.titulo?.toLowerCase().includes(b) || 
      t.descripcion?.toLowerCase().includes(b)
    );
  }, [tareas, busqueda]);

  const responsablesFiltro = useMemo(() => {
    const mapa = new Map();
    tareas.forEach((tarea) => {
      getTaskAssignees(tarea).forEach((asignado) => {
        mapa.set(String(asignado.id), asignado);
      });
    });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [tareas]);

  const tareasFiltradasAvanzadas = useMemo(() => (
    tareasFiltradas.filter((tarea) => {
      if (filtroPrioridad !== 'todas' && tarea.prioridad !== filtroPrioridad) return false;

      if (filtroResponsable !== 'todos') {
        if (filtroResponsable === 'sin_asignar') {
          if (getTaskAssignees(tarea).length > 0) return false;
        } else if (!getTaskAssignees(tarea).some((asignado) => String(asignado.id) === filtroResponsable)) {
          return false;
        }
      }

      if (!tareaCoincideConRango(tarea, filtroFecha)) return false;

      return true;
    })
  ), [filtroFecha, filtroPrioridad, filtroResponsable, tareasFiltradas]);

  const tareasListaFiltradas = useMemo(() => sortTareasLista(tareasFiltradasAvanzadas), [tareasFiltradasAvanzadas]);

  // Se recorta en vez de reiniciar con un efecto: al filtrar, el total baja y
  // esto deja la pagina en rango por si solo, sin renders extra.
  const totalPaginasLista = Math.max(1, Math.ceil(tareasListaFiltradas.length / TAREAS_POR_PAGINA));
  const paginaLista = Math.min(pagina, totalPaginasLista);
  const tareasDeLaPagina = tareasListaFiltradas.slice(
    (paginaLista - 1) * TAREAS_POR_PAGINA,
    paginaLista * TAREAS_POR_PAGINA,
  );

  const handleEliminar = async (tarea) => {
    if (!window.confirm(t('taskDeleteConfirm', { name: tarea.titulo }))) return;
    try {
      await tareasService.eliminar(tarea.id);
      setTareas(prev => prev.filter(x => x.id !== tarea.id));
      showToast(t('taskDeleted'));
    } catch (err) { showToast(err.message, 'error'); }
  };

  // ── Seleccion multiple ────────────────────────────────────────────────────
  // "Todas" abarca lo filtrado y no solo la pagina a la vista: si acabas de
  // filtrar para limpiar un grupo, esperas que entre todo el grupo.
  const seleccionActiva = modoSeleccion && vista !== 'gantt';

  const salirDeSeleccion = useCallback(() => {
    setModoSeleccion(false);
    setSeleccionadas(new Set());
  }, []);

  const alternarSeleccion = useCallback((tareaId) => {
    setSeleccionadas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(tareaId)) siguiente.delete(tareaId);
      else siguiente.add(tareaId);
      return siguiente;
    });
  }, []);

  const handleEliminarSeleccionadas = async () => {
    const ids = [...seleccionadas];
    if (!ids.length) return;
    if (!window.confirm(t('taskDeleteManyConfirm', { count: ids.length }))) return;

    try {
      const respuesta = await tareasService.eliminarVarias(ids);
      // Se quitan solo las que el servidor confirma: si alguna se omitio por
      // permisos, tiene que seguir en pantalla.
      const borradas = new Set(respuesta.ids || ids);
      setTareas((prev) => prev.filter((x) => !borradas.has(x.id)));
      salirDeSeleccion();
      showToast(respuesta.omitidas
        ? t('taskDeletedManyPartial', { count: respuesta.eliminadas, omitidas: respuesta.omitidas })
        : t('taskDeletedMany', { count: respuesta.eliminadas }));
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleCambiarEstado = async (id, est) => {
    const tareaAnterior = tareas.find(x => x.id === id);
    if (!tareaAnterior || tareaAnterior.estado === est) return;

    const completadoEnOptimista = est === 'HECHO'
      ? new Date().toISOString()
      : null;

    const tareaOptimista = {
      ...tareaAnterior,
      estado: est,
      completadoEn: completadoEnOptimista,
      venceEn: getVenceEnOptimista(tareaAnterior, est),
    };

    setTareas(prev => sortTareas(prev.map(x => x.id === id ? tareaOptimista : x)));

    if (tareaEditando?.id === id) {
      setTareaEditando(prev => prev ? { ...prev, estado: est, completadoEn: completadoEnOptimista, venceEn: getVenceEnOptimista(prev, est) } : prev);
    }

    try {
      const { tarea } = await tareasService.actualizarEstado(id, est);
      const tareaConfirmada = {
        ...tareaAnterior,
        ...tarea,
        estado: est,
        completadoEn: est === 'HECHO'
          ? (tarea.completadoEn || completadoEnOptimista)
          : null,
        venceEn: getVenceEnOptimista(tarea, est),
      };

      setTareas(prev => sortTareas(prev.map(x => x.id === id ? tareaConfirmada : x)));
      if (tareaEditando?.id === id) {
        setTareaEditando(tareaConfirmada);
      }
    } catch (err) {
      setTareas(prev => sortTareas(prev.map(x => x.id === id ? tareaAnterior : x)));
      if (tareaEditando?.id === id) {
        setTareaEditando(tareaAnterior);
      }
      showToast(err.message, 'error');
    }
  };

  const handleActualizarTarea = async (id, datos) => {
    try {
      const { tarea } = await tareasService.editar(id, datos);
      setTareas(prev => sortTareas(prev.map(x => x.id === id ? tarea : x)));
      showToast(t('taskUpdated'));
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleGuardarTarea = useCallback(({ tarea, creada = false } = {}) => {
    if (!tarea) {
      cerrarModalTarea();
      return;
    }

    setTareas((prev) => {
      const existe = prev.some((item) => item.id === tarea.id);
      const siguientes = existe
        ? prev.map((item) => (item.id === tarea.id ? { ...item, ...tarea } : item))
        : [tarea, ...prev];

      return sortTareas(siguientes);
    });

    setTareaEditando((prev) => (prev?.id === tarea.id ? { ...prev, ...tarea } : prev));
    cerrarModalTarea();
    showToast(creada ? t('taskCreated') : t('taskUpdated'));
  }, [cerrarModalTarea, showToast, t]);

  const handleSincronizarTarea = useCallback((tareaId, cambios = {}) => {
    if (!tareaId || !cambios || Object.keys(cambios).length === 0) return;

    setTareas((prev) => sortTareas(
      prev.map((tarea) => (tarea.id === tareaId ? { ...tarea, ...cambios } : tarea))
    ));
    setTareaEditando((prev) => (prev?.id === tareaId ? { ...prev, ...cambios } : prev));
  }, []);

  const handleImportado = useCallback((resultado = {}) => {
    const tareasImportadas = Array.isArray(resultado.tareas) ? resultado.tareas : [];

    if (tareasImportadas.length > 0) {
      setTareas((prev) => {
        const existentes = new Set(prev.map((tarea) => tarea.id));
        const nuevas = tareasImportadas.filter((tarea) => !existentes.has(tarea.id));
        return sortTareas([...prev, ...nuevas]);
      });
    }

    setModalImportar(false);
    showToast(t('taskImportSuccess', { count: resultado.creadas || tareasImportadas.length || 0 }));
  }, [showToast, t]);

  const handleExportar = (tipo) => {
    try {
      tareasService.exportarProyecto(id, tipo);
      showToast(t('taskExportStarted', { type: tipo.toUpperCase() }));
      setModalExportar(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleGuardarPlantilla = async ({ nombre, descripcion }) => {
    try {
      await proyectosService.guardarComoPlantilla(id, { nombre, descripcion });
      showToast(t('taskTemplateSaved'));
      setModalPlantilla(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Terminar / reactivar / archivar desde el detalle, igual que en la tarjeta
  const handleCambiarEstadoProyecto = async (nuevoEstado) => {
    const anterior = proyecto?.estado;
    setProyecto((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
    try {
      const formData = new FormData();
      formData.append('estado', nuevoEstado);
      await proyectosService.editar(id, formData);
      showToast(t(getEstadoProyecto(nuevoEstado).labelKey));
    } catch (err) {
      setProyecto((prev) => (prev ? { ...prev, estado: anterior } : prev));
      showToast(err.message, 'error');
    }
  };

  if (cargando) return <PageSkeleton cards={4} />;

  return (
    <div className="max-w-7xl mx-auto">
      
      {/* Header Premium */}
      <div className="mb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/proyectos" className="text-blue-600 font-medium text-[10px] lg:text-xs flex items-center gap-1 hover:gap-2 transition-all">
              <ChevronLeft size={14} /> {t('projects')}
            </Link>
            <span className="text-[var(--color-border)]">/</span>
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] truncate max-w-[200px]">ID #{proyecto?.id}</span>
          </div>
          <h1 className="text-2xl lg:text-5xl font-semibold text-[var(--color-text)] tracking-tight leading-tight mb-2">
            {proyecto?.nombre}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className="text-[10px] font-medium px-2.5 py-1 rounded-md"
              style={{ color: estadoProyecto.color, background: estadoProyecto.bg }}
            >
              {t(estadoProyecto.labelKey)}
            </span>
            {/* Mismo aviso que en la tarjeta: 100% de tareas pero sin visto bueno */}
            {listoParaRevision && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-md text-amber-700 bg-amber-100">
                <BadgeCheck size={12} /> {t('projectReadyForReview')}
              </span>
            )}
          </div>

          <p className="text-sm lg:text-base text-[var(--color-text-dim)] font-normal max-w-2xl">{proyecto?.descripcion}</p>
        </div>

        {/* Importar y exportar viven en el menu: sacarlos como iconos sueltos
            dejaba tres botones seguidos y se veia recargado. Lo que si cambio
            son sus iconos, flechas que indican la direccion (entra / sale);
            antes los dos usaban el mismo de descarga y no se distinguian. */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => { setTareaEditando(null); setModal(true); }}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 lg:py-3.5 bg-blue-600 text-white rounded-xl text-xs lg:text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> {t('projectNewTask')}
          </button>

          <ActionMenu
            size={18}
            className="shrink-0 p-3 lg:p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm"
            items={[
              { label: t('projectImport'), icon: <ArrowDownToLine size={15} />, onSelect: () => setModalImportar(true) },
              { label: t('projectExport'), icon: <ArrowUpFromLine size={15} />, onSelect: () => setModalExportar(true) },
              usuario?.rol === 'ADMIN' && { separator: true },
              usuario?.rol === 'ADMIN' && { label: t('projectSaveTemplate'), icon: <Save size={15} />, onSelect: () => setModalPlantilla(true) },
              usuario?.rol === 'ADMIN' && { separator: true },
              usuario?.rol === 'ADMIN' && estadoProyecto.value !== 'TERMINADO' && estadoProyecto.value !== 'ARCHIVADO' && {
                label: t('projectMarkFinished'),
                icon: <BadgeCheck size={15} />,
                onSelect: () => handleCambiarEstadoProyecto('TERMINADO'),
              },
              usuario?.rol === 'ADMIN' && estadoProyecto.value !== 'ACTIVO' && {
                label: t('projectReactivate'),
                icon: <RotateCcw size={15} />,
                onSelect: () => handleCambiarEstadoProyecto('ACTIVO'),
              },
              usuario?.rol === 'ADMIN' && (estadoProyecto.value === 'ARCHIVADO'
                ? { label: t('projectUnarchive'), icon: <ArchiveRestore size={15} />, onSelect: () => handleCambiarEstadoProyecto('ACTIVO') }
                : { label: t('projectArchive'), icon: <Archive size={15} />, onSelect: () => handleCambiarEstadoProyecto('ARCHIVADO') }),
            ]}
          />
        </div>
      </div>

      {/* Solo los dos progresos. Las tres tarjetas de pendientes, en marcha y
          hechas se quitaron: repetian lo que ya cuenta el Kanban columna a
          columna, y ocupaban toda una franja de la pantalla.

          "Mi progreso" solo sale si de verdad tienes tareas aqui. A un admin que
          entra a supervisar le salia un 0% que no significaba nada. */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:gap-10">
        <BarraProgreso
          etiqueta={t('projectGeneralProgress')}
          porcentaje={progresoGeneral}
          detalle={`${stats.hechas} ${t('projectOfTasksDone', { total: totalGeneral })}`}
          color="#2563eb"
        />
        {mostrarMiProgreso && (
          <BarraProgreso
            etiqueta={t('projectMyProgress')}
            porcentaje={progresoMiembro}
            detalle={`${totalMiembro} ${t('taskAssignedPlural')}`}
            color="#10b981"
          />
        )}
      </div>

      {/* Toolbar Vistas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <ToggleVista vista={vista} onChange={setVista} t={t} />
          
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)', opacity: 0.5 }} />
            <input 
              type="text"
              placeholder={t('projectTaskSearch')}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.5rem',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-dim)' }}>
            {t('projectShowing')} {tareasFiltradasAvanzadas.length} {tareasFiltradasAvanzadas.length === 1 ? t('projectTaskSingular') : t('projectTaskPlural')}
          </span>

          {/* El gantt se queda fuera: ahi las tareas son barras de tiempo y
              marcarlas una a una no aporta nada. */}
          {vista !== 'gantt' && (
            <button
              type="button"
              onClick={() => (modoSeleccion ? salirDeSeleccion() : setModoSeleccion(true))}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                modoSeleccion
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
              }`}
            >
              <CheckSquare size={16} />
              {modoSeleccion ? t('cancel') : t('taskSelect')}
            </button>
          )}

          {/* Los tres filtros, antes en una franja fija, ahora tras este boton */}
          <FiltrosTareas
            fecha={filtroFecha}
            onFechaChange={(rango) => setFiltroFecha(rango || { from: null, to: null })}
            prioridad={filtroPrioridad}
            onPrioridadChange={setFiltroPrioridad}
            prioridades={PRIORIDADES}
            responsable={filtroResponsable}
            onResponsableChange={setFiltroResponsable}
            responsables={responsablesFiltro}
          />
        </div>
      </div>

      {/* Barra de la seleccion. Va pegada arriba al desplazar para que el boton
          de eliminar siga a mano con una lista larga. */}
      {seleccionActiva && (
        <div className="sticky top-2 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 shadow-md">
          <span className="text-sm font-medium text-[var(--color-text)]">
            {t('taskSelectedCount', { count: seleccionadas.size })}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSeleccionadas(new Set(tareasFiltradasAvanzadas.map((tarea) => tarea.id)))}
              disabled={!tareasFiltradasAvanzadas.length}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)] disabled:opacity-40"
            >
              {t('taskSelectAll')}
            </button>
            <button
              type="button"
              onClick={() => setSeleccionadas(new Set())}
              disabled={!seleccionadas.size}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)] disabled:opacity-40"
            >
              {t('taskSelectNone')}
            </button>
            <button
              type="button"
              onClick={handleEliminarSeleccionadas}
              disabled={!seleccionadas.size}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              <Trash2 size={15} />
              {t('delete')}
            </button>
            <button
              type="button"
              onClick={salirDeSeleccion}
              aria-label={t('cancel')}
              className="rounded-lg p-1.5 text-[var(--color-text-dim)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Documentos del proyecto a la derecha, solo junto a la lista. El Kanban
          y el gantt necesitan todo el ancho: con la columna al lado, las tres
          columnas del tablero y las barras del gantt quedaban estrujadas. */}
      <div className={`grid gap-6 ${vista === 'lista' ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
      <div style={{ minHeight: '500px' }}>
        {vista === 'lista' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Sin tope de alto ni scroll propio: con 10 tareas por pagina la
                lista ya no crece sin fin, y dos desplazamientos anidados (el de
                la lista y el de la pagina) se estorbaban entre si. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tareasListaFiltradas.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: '1.5rem', border: '1px dashed var(--color-border)', color: 'var(--color-text-dim)' }}>
                  <Search size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                  <p style={{ fontWeight: 400 }}>{t('projectNoTasksFound')}</p>
                </div>
              ) : (
                tareasDeLaPagina.map(t => (
                  <TareaCard
                    key={t.id}
                    tarea={t}
                    usuarioActual={usuario}
                    onClick={(x) => { setTareaEditando(x); setModal(true); }}
                    onEliminar={handleEliminar}
                    onCambiarEstado={handleCambiarEstado}
                    seleccionable={seleccionActiva}
                    seleccionada={seleccionadas.has(t.id)}
                    onAlternarSeleccion={alternarSeleccion}
                  />
                ))
              )}
            </div>

            {/* Paginacion en vez del antiguo "Ver mas tareas": con ese boton la
                lista solo crecia y no habia forma de volver atras ni de saber
                por donde ibas. */}
            {totalPaginasLista > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm font-normal text-[var(--color-text-muted)]">
                  {t('timelineRange', {
                    desde: (paginaLista - 1) * TAREAS_POR_PAGINA + 1,
                    hasta: Math.min(paginaLista * TAREAS_POR_PAGINA, tareasListaFiltradas.length),
                    total: tareasListaFiltradas.length,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Tooltip label={t('previous')}>
                    <button
                      type="button"
                      onClick={() => setPagina((n) => Math.max(1, n - 1))}
                      disabled={paginaLista === 1}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </Tooltip>
                  <span className="min-w-[70px] text-center text-sm font-medium text-[var(--color-text)]">
                    {paginaLista} / {totalPaginasLista}
                  </span>
                  <Tooltip label={t('next')}>
                    <button
                      type="button"
                      onClick={() => setPagina((n) => Math.min(totalPaginasLista, n + 1))}
                      disabled={paginaLista === totalPaginasLista}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        )}
        {vista === 'kanban' && (
          <KanbanView
            tareas={tareasFiltradasAvanzadas}
            onClick={(x) => { setTareaEditando(x); setModal(true); }}
            onEliminar={handleEliminar}
            onCambiarEstado={handleCambiarEstado}
            onEditar={(x) => { setTareaEditando(x); setModal(true); }}
            onActualizarTarea={handleActualizarTarea}
            seleccionable={seleccionActiva}
            seleccionadas={seleccionadas}
            onAlternarSeleccion={alternarSeleccion}
          />
        )}
        {vista === 'gantt' && <GanttView proyecto={proyecto} tareas={tareasFiltradasAvanzadas} onSeleccionarTarea={(x) => { setTareaEditando(x); setModal(true); }} />}
      </div>

        {vista === 'lista' && (
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="mb-3 text-xs font-normal leading-relaxed text-[var(--color-text-muted)]">
              {t('projectDocsHint')}
            </p>
            <TaskAttachments
              compacto
              tareaId={proyecto?.id}
              type="proyectos"
              title={t('projectFieldDocuments')}
              uploadLabel={t('projectAddFiles')}
            />
          </div>
        </aside>
        )}
      </div>

      {/* Modales */}
      {modal && (
        <ModalTarea 
          tarea={tareaEditando} 
          proyectoId={id} 
          usuarioActual={usuario}
          usuarios={usuarios} 
          onClose={cerrarModalTarea} 
          onGuardar={handleGuardarTarea} 
          onTareaMutada={handleSincronizarTarea}
          onEliminar={handleEliminar}
        />
      )}
      {modalImportar && (
        <ModalImportar 
          proyectoId={id} 
          usuarios={usuarios} 
          usuarioActual={usuario}
          onClose={() => setModalImportar(false)} 
          onImportado={handleImportado} 
        />
      )}
      {modalExportar && (
        <ModalExportarProyecto
          proyecto={proyecto}
          onClose={() => setModalExportar(false)}
          onExportar={handleExportar}
        />
      )}
      {modalPlantilla && (
        <ModalGuardarPlantilla
          proyecto={proyecto}
          onClose={() => setModalPlantilla(false)}
          onGuardar={handleGuardarPlantilla}
        />
      )}
    </div>
  );
};

// ── Modal de Tarea (Simplified & Professional) ──────────────────────────────
const ModalTarea = ({ tarea, proyectoId, usuarioActual, usuarios, onClose, onGuardar, onTareaMutada, onEliminar }) => {
  const { t } = usePreferences();
  const creadorEsUsuarioActual = tarea?.creador?.id === usuarioActual?.id
    || (!tarea?.creador?.id && (getTaskAssignees(tarea).length === 0 || isTaskAssignedToUser(tarea, usuarioActual?.id)));
  const [form, setForm] = useState({
    titulo: tarea?.titulo || '',
    descripcion: tarea?.descripcion || '',
    numeroActividad: tarea?.numeroActividad || '',
    asignadoIds: getTaskAssignees(tarea).map((asignado) => asignado.id),
    prioridad: tarea?.prioridad || 'MEDIA',
    estado: tarea?.estado || 'PENDIENTE',
    fechaInicio: tarea?.fechaInicio ? tarea.fechaInicio.slice(0,10) : new Date().toISOString().slice(0,10),
    venceEn: tarea?.venceEn ? tarea.venceEn.slice(0,10) : ''
  });
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]);

  const sincronizarTarea = useCallback((cambios = {}) => {
    if (!tarea?.id) return;
    onTareaMutada?.(tarea.id, cambios);
  }, [onTareaMutada, tarea?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (tarea) {
        const response = await tareasService.editar(tarea.id, form);
        onGuardar({ tarea: response.tarea, creada: false });
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k,v]) => {
          if (k === 'asignadoIds') {
            fd.append(k, JSON.stringify(v));
            return;
          }
          fd.append(k,v);
        });
        archivos.forEach((file) => fd.append('archivos', file));
        const response = await tareasService.crear(proyectoId, fd);
        onGuardar({ tarea: response.tarea, creada: true });
      }
    } catch (err) { alert(err.message); }
    finally { setCargando(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      maxWidth="672px"
      title={tarea ? t('taskEditTitle') : t('taskNewTitle')}
      footer={(
        <div className="flex flex-col-reverse lg:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all"
          >
            {t('cancel')}
          </button>
          {tarea && (
            <button
              type="button"
              onClick={() => { onEliminar(tarea); onClose(); }}
              className="flex-1 px-6 py-4 bg-red-50 text-red-600 rounded-2xl text-xs font-medium hover:bg-red-100 transition-all"
            >
              {t('delete')}
            </button>
          )}
          <button onClick={handleSubmit} className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50" disabled={cargando}>
            {cargando ? t('saving') : t('save')}
          </button>
        </div>
      )}
    >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Lo necesario para dar de alta la tarea ─────────────────── */}
            <div className="space-y-2">
              <EtiquetaCampo texto={t('taskTitle')} />
              <input
                className="form-input"
                value={form.titulo}
                onChange={e => setForm({...form, titulo: e.target.value})}
                required
                placeholder={t('taskTitlePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <EtiquetaCampo texto={t('taskAssignedTo')} />
              {/* Antes eran todos los nombres del equipo como botones a la
                  vista; con un equipo grande el bloque medía media ventana. */}
              <SelectorMultiple
                conBuscador
                placeholder={t('taskUnassigned')}
                seleccionados={form.asignadoIds}
                onToggle={(id) => setForm((prev) => ({
                  ...prev,
                  asignadoIds: prev.asignadoIds.includes(id)
                    ? prev.asignadoIds.filter((asignadoId) => asignadoId !== id)
                    : [...prev.asignadoIds, id],
                }))}
                opciones={usuarios.map((u) => ({ valor: u.id, etiqueta: u.nombre }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <EtiquetaCampo texto={t('taskStatus')} />
                <select className="form-input form-select" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                  {ESTADOS_TAREA.map(e => <option key={e.value} value={e.value}>{t(e.labelKey)}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <EtiquetaCampo texto={t('taskPriority')} />
                <select className="form-input form-select" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                  {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{t(p.labelKey)}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <EtiquetaCampo texto={t('taskDuration')} />
              {/* Calendario en linea. Antes abria una ventana sobre la ventana
                  de la tarea: se veia encimado y los desplegables nativos del
                  formulario (prioridad, estado) se dibujaban por encima. */}
              <SelectorRangoFechas
                plegable
                conLeyenda={false}
                desde={form.fechaInicio}
                hasta={form.venceEn}
                onChange={({ desde, hasta }) => setForm({ ...form, fechaInicio: desde, venceEn: hasta })}
              />
            </div>

            {/* Igual que en la lista: solo se dice quien asigno si fue otro */}
            {!creadorEsUsuarioActual && tarea?.creador?.nombre && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs font-medium text-blue-700">
                {t('taskAssignedBy')} {tarea.creador.nombre}
              </div>
            )}

            {/* ── Lo opcional, al final ─────────────────────────────────────
                Antes la descripcion y el numero de actividad iban entre el
                titulo y los responsables, asi que para llegar a lo que de
                verdad hace falta habia que pasar por encima de ellos. */}
            <div className="border-t border-[var(--color-border)] pt-5 space-y-6">
              <div className="space-y-2">
                <EtiquetaCampo texto={t('taskDescription')} opcional />
                <textarea
                  className="form-input resize-none"
                  rows="3"
                  value={form.descripcion}
                  onChange={e => setForm({...form, descripcion: e.target.value})}
                  placeholder={t('taskDescriptionPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <EtiquetaCampo texto={t('taskActivityNumber')} opcional />
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={form.numeroActividad}
                  onChange={e => setForm({ ...form, numeroActividad: e.target.value })}
                  placeholder={t('taskActivityPlaceholder')}
                />
              </div>

              <TaskAttachments
                tareaId={tarea?.id}
                type="tareas"
                title={`${t('taskSupportDocuments')} · ${t('fieldOptional')}`}
                pendingFiles={archivos}
                onPendingFilesChange={setArchivos}
                onAttachmentsChange={(adjuntos) => sincronizarTarea({ adjuntos })}
                showUploader
                showExisting={Boolean(tarea?.id)}
                uploadLabel={tarea ? t('taskAddFiles') : t('taskSelectFiles')}
              />
            </div>
          </form>

          {tarea?.id && (
            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <TaskComments
                tareaId={tarea.id}
                type="tareas"
                onCommentsChange={(comentarios) => sincronizarTarea({ comentarios })}
              />
            </div>
          )}
    </Modal>
  );
};

const ModalExportarProyecto = ({ proyecto, onClose, onExportar }) => {
  const { t } = usePreferences();
  return (
  <Modal
    open
    onClose={onClose}
    maxWidth="448px"
    title={t('taskExportTitle')}
    subtitle={proyecto?.nombre}
    footer={(
      <button onClick={onClose} className="w-full px-6 py-3 rounded-2xl text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-all">
        {t('close')}
      </button>
    )}
  >
      <div className="space-y-3">
        <button
          onClick={() => onExportar('excel')}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-3)] transition-all"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-[var(--color-text)]"><FileSpreadsheet size={18} /> Excel</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)]">.xlsx</span>
        </button>
        <button
          onClick={() => onExportar('json')}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-3)] transition-all"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-[var(--color-text)]"><FileJson size={18} /> JSON</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)]">.json</span>
        </button>
      </div>
  </Modal>
  );
};

const ModalGuardarPlantilla = ({ proyecto, onClose, onGuardar }) => {
  const { t } = usePreferences();
  const [form, setForm] = useState({
    nombre: t('taskTemplateDefaultName', { project: proyecto?.nombre || t('projects') }),
    descripcion: proyecto?.descripcion || '',
  });
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await onGuardar(form);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      maxWidth="512px"
      title={t('projectSaveTemplate')}
    >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('fieldName')}</label>
            <input
              className="form-input"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)]">{t('taskDescription')}</label>
            <input
              className="form-input"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div className="flex flex-col-reverse lg:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-all">
              {t('cancel')}
            </button>
            <button type="submit" disabled={guardando} className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
              {guardando ? t('saving') : t('save')}
            </button>
          </div>
        </form>
    </Modal>
  );
};

export default ProyectoDetallePage;
