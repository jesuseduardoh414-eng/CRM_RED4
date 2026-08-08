// Página de Proyectos (Material Design Premium)
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePreferences } from '../context/PreferencesContext';
import { agendaService, proyectosService, usuariosService } from '../services/api';
import { PageSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';
import Tooltip from '../components/Tooltip';
import ActionMenu from '../components/ActionMenu';
import CampoFiltro from '../components/CampoFiltro';
import SelectorMultiple from '../components/SelectorMultiple';
import SelectorRangoFechas from '../components/SelectorRangoFechas';
import TaskAttachments from '../components/TaskAttachments';
import { sortProyectos } from '../utils/sorters';
import { useDebounce } from '../utils/useDebounce';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ESTADOS_PROYECTO,
  getEstadoProyecto,
  normalizarEstadoProyecto,
  estaListoParaRevision,
} from '../utils/estadosProyecto';
import { 
  Code2, 
  BarChart3, 
  Mail, 
  Folder,
  Trash2,
  Plus,
  FolderOpen, 
  ChevronRight, 
  ChevronLeft,
  Pencil,
  Megaphone,
  Archive,
  ArchiveRestore,
  BadgeCheck,
  RotateCcw,
  Search
} from 'lucide-react';

// ── Configuraciones Visuales ────────────────────────────────────────────────
const AREA_CONF = {
  DESARROLLO:     { labelKey: 'areaDesarrollo',    color: '#2563eb', bg: 'rgba(37,99,235,0.08)', icon: <Code2 size={14} /> },
  ADMINISTRACION: { labelKey: 'areaAdministracion', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: <BarChart3 size={14} /> },
  COMUNICACION:   { labelKey: 'areaComunicacion',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <Mail size={14} /> },
  MARKETING:      { labelKey: 'areaMarketing',      color: '#db2777', bg: 'rgba(219,39,119,0.08)', icon: <Megaphone size={14} /> },
};


// 9 = tres filas completas en la rejilla de tres columnas del escritorio.
const PROYECTOS_POR_PAGINA = 9;

const getAreasProyecto = (area) => {
  if (!area) return ['DESARROLLO'];
  return area.split(',').map(a => a.trim()).filter(Boolean);
};

const getLabelAreas = (area, tFn) => getAreasProyecto(area)
  .map(a => tFn ? tFn(AREA_CONF[a]?.labelKey || 'areaGeneral') : (AREA_CONF[a]?.labelKey || a))
  .join(', ');

const esAdminUsuario = (usuario) => usuario?.rol?.toString().toUpperCase() === 'ADMIN';

const dateKey = (date) => {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const parseDateKey = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const monthRangeFor = (value) => {
  const base = value ? parseDateKey(value) : new Date();
  return {
    start: new Date(base.getFullYear(), base.getMonth(), 1, 12),
    end: new Date(base.getFullYear(), base.getMonth() + 1, 0, 12),
  };
};

const expandBlockedDates = (conflictos) => {
  const blocked = new Map();
  conflictos.forEach(conflicto => {
    const start = new Date(conflicto.fechaInicio);
    const end = conflicto.fechaFin ? new Date(conflicto.fechaFin) : new Date(start);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12);
    const maxDays = 370;
    let count = 0;
    while (cursor <= last && count < maxDays) {
      const key = dateKey(cursor);
      if (!blocked.has(key)) blocked.set(key, []);
      blocked.get(key).push(conflicto);
      cursor.setDate(cursor.getDate() + 1);
      count += 1;
    }
  });
  return blocked;
};

const esBloqueoReal = (conflicto) => conflicto.tipo !== 'proyecto';

const conflictOverlapsRange = (conflicto, startKey, endKey) => {
  if (!startKey) return false;
  const rangeStart = parseDateKey(startKey);
  const rangeEnd = parseDateKey(endKey || startKey);
  const conflictStart = new Date(conflicto.fechaInicio);
  const conflictEnd = conflicto.fechaFin ? new Date(conflicto.fechaFin) : new Date(conflictStart);
  if (Number.isNaN(conflictStart.getTime()) || Number.isNaN(conflictEnd.getTime())) return false;

  const start = new Date(conflictStart.getFullYear(), conflictStart.getMonth(), conflictStart.getDate(), 0, 0, 0, 0);
  const end = new Date(conflictEnd.getFullYear(), conflictEnd.getMonth(), conflictEnd.getDate(), 23, 59, 59, 999);
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59, 999);
  return start <= rangeEnd && end >= rangeStart;
};

// ── Tarjeta de Proyecto ─────────────────────────────────────────────────────
const ProyectoCard = ({ proyecto, onEditar, onEliminar, onCambiarEstado, onVerDetalle, esAdmin }) => {
  const { t, locale } = usePreferences();
  const areaLabel = getLabelAreas(proyecto.area, t);
  const estado = getEstadoProyecto(proyecto.estado);
  const listoParaRevision = esAdmin && estaListoParaRevision(proyecto);
  const progresoGeneral = proyecto.progresoGeneral ?? proyecto.progreso ?? 0;
  const progresoMiembro = proyecto.progresoMiembro;

  return (
    <div 
      onClick={onVerDetalle}
      className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-lg lg:text-xl font-semibold text-slate-900 truncate mb-1">{proyecto.nombre}</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ color: estado.color, background: estado.bg }}>
              {t(estado.labelKey)}
            </span>
            {/* Aviso al admin: todas las tareas estan hechas pero nadie ha dado
                el visto bueno todavia. No se marca solo a proposito. */}
            {listoParaRevision && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md text-amber-700 bg-amber-100">
                <BadgeCheck size={12} /> {t('projectReadyForReview')}
              </span>
            )}
            <span className="text-[10px] font-medium text-slate-400">
              {areaLabel}
            </span>
          </div>
        </div>
        {/* Los 3 puntos ocupan el sitio de la flecha: la tarjeta entera ya lleva
            al proyecto, asi que la flecha solo repetia lo mismo y obligaba a
            mantener un pie aparte solo para el menu. */}
        {esAdmin && (
          <ActionMenu
            size={16}
            className="-mr-1 -mt-1 shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-50"
            items={[
              { label: t('edit'), icon: <Pencil size={15} />, onSelect: () => onEditar(proyecto) },
              estado.value !== 'TERMINADO' && estado.value !== 'ARCHIVADO' && {
                label: t('projectMarkFinished'),
                icon: <BadgeCheck size={15} />,
                onSelect: () => onCambiarEstado(proyecto, 'TERMINADO'),
              },
              estado.value !== 'ACTIVO' && {
                label: t('projectReactivate'),
                icon: <RotateCcw size={15} />,
                onSelect: () => onCambiarEstado(proyecto, 'ACTIVO'),
              },
              { separator: true },
              estado.value === 'ARCHIVADO'
                ? { label: t('projectUnarchive'), icon: <ArchiveRestore size={15} />, onSelect: () => onCambiarEstado(proyecto, 'ACTIVO') }
                : { label: t('projectArchive'), icon: <Archive size={15} />, onSelect: () => onCambiarEstado(proyecto, 'ARCHIVADO') },
              { label: t('delete'), icon: <Trash2 size={15} />, onSelect: () => onEliminar(proyecto), danger: true },
            ]}
          />
        )}
      </div>

      <p className="text-sm text-slate-500 font-normal line-clamp-2 min-h-[40px]">
        {proyecto.descripcion || t('projectDefaultDescription')}
      </p>

      {/* mt-auto: con las descripciones de distinto largo, esto deja las barras
          de progreso alineadas entre las tarjetas de una misma fila. */}
      <div className="space-y-3 mt-auto">
        <div className="flex justify-between items-center text-[10px] font-medium">
          <span className="text-slate-400">{t('projectGeneralProgress')}</span>
          <span className="text-slate-900">{progresoGeneral}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
            style={{ width: `${progresoGeneral}%` }} 
          />
        </div>
        {progresoMiembro !== null && progresoMiembro !== undefined && (
          <>
            <div className="flex justify-between items-center text-[10px] font-medium">
              <span className="text-slate-400">{t('projectMyProgress')}</span>
              <span className="text-slate-900">{progresoMiembro}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: `${progresoMiembro}%` }}
              />
            </div>
          </>
        )}
      </div>

    </div>
  );
};

// ── Modal de Proyecto ────────────────────────────────────────────────────────

/**
 * Pasos del alta de proyecto. Se separo asi a peticion del usuario: el
 * formulario completo eran ocho bloques de corrido y no se sabia por donde
 * empezar. Lo opcional queda al final para poder guardar sin tocarlo.
 */
const PASOS_PROYECTO = [
  { id: 1, labelKey: 'projectStepBasics' },
  { id: 2, labelKey: 'projectStepTeam' },
  { id: 3, labelKey: 'projectStepOptional' },
];

const ModalProyecto = ({ proyecto, onClose, onGuardar }) => {
  const { t } = usePreferences();
  const { showToast } = useToast();
  const { usuario: usuarioActual } = useAuth();
  const esAdminArea = usuarioActual?.rol === 'ADMIN' && usuarioActual?.area !== 'ADMINISTRACION';
  const areasIniciales = proyecto?.area ? getAreasProyecto(proyecto.area) : [usuarioActual?.area || 'DESARROLLO'];
  const [form, setForm] = useState({
    nombre: proyecto?.nombre || '',
    descripcion: proyecto?.descripcion || '',
    estado: proyecto?.estado || 'ACTIVO',
    areas: areasIniciales,
    fechaInicio: proyecto?.fechaInicio ? proyecto.fechaInicio.slice(0, 10) : new Date().toISOString().slice(0, 10),
    fechaFin: proyecto?.fechaFin ? proyecto.fechaFin.slice(0, 10) : '',
    miembrosIds: proyecto?.miembros?.filter(m => m.id !== usuarioActual?.id).map(m => m.id) || [],
    plantillaId: '',
  });
  const [paso, setPaso] = useState(1);
  const [usuarios, setUsuarios] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [ocupados, setOcupados] = useState({});
  const [consultandoDisponibilidad, setConsultandoDisponibilidad] = useState(false);
  const miembrosExistentes = new Set(
    (proyecto?.miembros || [])
      .filter(m => m.id !== usuarioActual?.id)
      .map(m => m.id)
  );

  useEffect(() => {
    usuariosService.listarParaProyectos().then(d => setUsuarios(d.usuarios)).catch(console.error);
    if (!proyecto) {
      proyectosService.listarPlantillas().then(d => setPlantillas(d.plantillas || [])).catch(console.error);
    }
  }, []);

  const plantillaSeleccionada = !proyecto && form.plantillaId
    ? plantillas.find(p => String(p.id) === String(form.plantillaId))
    : null;

  // Mostrar todos los usuarios, pero agrupados o resaltados por el área seleccionada
  const usuariosSeleccionables = usuarios.filter(u => u.id !== usuarioActual?.id);
  const usuariosEnAreas = esAdminArea
    ? usuariosSeleccionables
    : usuariosSeleccionables.filter(u => form.areas.includes(u.area) || esAdminUsuario(u));
  const admins = usuariosSeleccionables.filter(esAdminUsuario);
  const usuariosPorArea = [
    ...(esAdminArea ? Object.keys(AREA_CONF) : form.areas).map(area => ({
      area,
      usuarios: usuariosEnAreas.filter(u => u.area === area && !esAdminUsuario(u)),
    })),
    ...(admins.length > 0 ? [{ area: 'ADMIN', usuarios: admins }] : []),
  ];
  const usuariosParaBloqueo = usuariosEnAreas.filter(u =>
    form.miembrosIds.includes(u.id) && (!proyecto || !miembrosExistentes.has(u.id))
  );
  const fechasBloqueadas = expandBlockedDates(
    usuariosParaBloqueo
      .filter(u => !esAdminUsuario(u))
      .flatMap(u => (ocupados[u.id] || []).map(conflicto => ({ ...conflicto, usuario: u })))
  );

  useEffect(() => {
    const consultar = async () => {
      const ids = usuariosEnAreas.map(u => u.id);
      // Antes tambien se salia cuando no habia fecha de inicio, y eso borraba
      // la ocupacion del equipo: al pulsar "Limpiar" desaparecian los dias
      // bloqueados y ya no volvian. Sin fecha se consulta desde el mes actual.
      if (ids.length === 0) {
        setOcupados({});
        return;
      }

      setConsultandoDisponibilidad(true);
      try {
        const rangoMes = monthRangeFor(form.fechaInicio);
        const consultaInicio = rangoMes.start;
        // Siempre un ano por delante, aunque el proyecto termine antes: el
        // calendario se puede navegar y los dias ocupados tienen que salir
        // marcados tambien en los meses siguientes.
        const consultaFin = new Date(rangoMes.start.getFullYear(), rangoMes.start.getMonth() + 12, 0, 23, 59, 59);
        consultaFin.setHours(23, 59, 59, 999);
        const data = await agendaService.consultarDisponibilidad({
          usuarios_ids: ids.join(','),
          inicio: consultaInicio.toISOString(),
          fin: consultaFin.toISOString(),
          excluir_proyecto_id: proyecto?.id,
        });
        const porUsuario = {};
        data.conflictos?.forEach(conflicto => {
          if (!porUsuario[conflicto.usuarioId]) porUsuario[conflicto.usuarioId] = [];
          porUsuario[conflicto.usuarioId].push(conflicto);
        });
        setOcupados(porUsuario);
      } catch (error) {
        console.error(error);
        setOcupados({});
      } finally {
        setConsultandoDisponibilidad(false);
      }
    };

    consultar();
    // `fechaFin` ya no entra: la consulta cubre siempre un ano desde el mes de
    // inicio, asi que elegir el fin no cambia lo que hay que pedir.
  }, [form.areas, form.fechaInicio, usuarios, usuarioActual?.id]);

  const toggleArea = (area) => {
    if (esAdminArea) return;
    setForm(prev => {
      const exists = prev.areas.includes(area);
      const areas = exists ? prev.areas.filter(a => a !== area) : [...prev.areas, area];
      const miembrosPermitidos = usuariosSeleccionables.filter(u => areas.includes(u.area) || esAdminUsuario(u)).map(u => u.id);
      return {
        ...prev,
        areas,
        miembrosIds: prev.miembrosIds.filter(id => miembrosPermitidos.includes(id)),
      };
    });
  };

  const toggleMiembro = (id) => {
    setForm(prev => {
      const exists = prev.miembrosIds.includes(id);
      if (exists) return { ...prev, miembrosIds: prev.miembrosIds.filter(x => x !== id) };
      return { ...prev, miembrosIds: [...prev.miembrosIds, id] };
    });
  };

  // Al editar no se recorre el asistente: se ve todo de corrido y se guarda.
  // Los pasos son para dar de alta, que es donde hay que decidir muchas cosas.
  const conPasos = !proyecto;
  const enPaso = (n) => !conPasos || paso === n;

  /** Lo minimo para poder pasar al siguiente paso. */
  const validarPaso = (n) => {
    if (n === 1 && !form.nombre.trim()) return t('projectFieldNameRequired');
    if (n === 2 && form.areas.length === 0) return t('projectPickArea');
    if (n === 2 && !form.fechaInicio) return t('projectStartDateRequired');
    return null;
  };

  const avanzar = () => {
    const error = validarPaso(paso);
    if (error) {
      showToast(error, 'error');
      return;
    }
    setPaso((n) => Math.min(PASOS_PROYECTO.length, n + 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Al guardar se revalidan todos los pasos: en el modo de edicion no se pasa
    // por `avanzar`, asi que nadie los habria comprobado.
    for (const p of PASOS_PROYECTO) {
      const error = validarPaso(p.id);
      if (error) {
        showToast(error, 'error');
        if (conPasos) setPaso(p.id);
        return;
      }
    }
    if (form.fechaFin && new Date(`${form.fechaFin}T23:59:59`) <= new Date(`${form.fechaInicio}T00:00:00`)) {
      showToast(t('projectDateRangeError'), 'error');
      if (conPasos) setPaso(2);
      return;
    }
    const inicio = parseDateKey(form.fechaInicio);
    const fin = form.fechaFin ? parseDateKey(form.fechaFin) : inicio;
    const cursor = new Date(inicio);
    while (cursor <= fin) {
      const conflictosDia = fechasBloqueadas.get(dateKey(cursor)) || [];
      if (conflictosDia.some(esBloqueoReal)) {
        alert(t('projectMemberRangeConflict'));
        return;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    setCargando(true);
    try {
      const formData = new FormData();
      formData.append('nombre', form.nombre);
      formData.append('descripcion', form.descripcion);
      formData.append('estado', form.estado);
      formData.append('area', form.areas.join(','));
      formData.append('fechaInicio', form.fechaInicio);
      formData.append('fechaFin', form.fechaFin);
      formData.append('miembrosIds', JSON.stringify(form.miembrosIds));
      if (form.plantillaId) formData.append('plantillaId', form.plantillaId);
      
      archivos.forEach(file => {
        formData.append('archivos', file);
      });

      if (proyecto) await proyectosService.editar(proyecto.id, formData);
      else await proyectosService.crear(formData);
      onGuardar();
    } catch (err) { alert(err.message); }
    finally { setCargando(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      maxWidth="576px"
      // Alto fijo: cada paso tiene distinto largo y sin esto la ventana crecia
      // y encogia al avanzar, moviendo de sitio los botones de abajo.
      height={conPasos ? 'min(720px, 90vh)' : undefined}
      title={proyecto ? t('projectEditTitle') : t('projectNewModalTitle')}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (paso === 1 ? onClose() : setPaso(paso - 1))}
            className="px-5 py-3 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all"
          >
            {conPasos && paso > 1 ? t('back') : t('cancel')}
          </button>

          {conPasos && paso < PASOS_PROYECTO.length ? (
            <Button type="button" size="lg" onClick={avanzar}>
              {t('next')} <ChevronRight size={16} />
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={handleSubmit} disabled={cargando}>
              {cargando ? t('saving') : t('projectSaveButton')}
            </Button>
          )}
        </div>
      )}
    >
          {/* Indicador de pasos. Solo al crear: para editar es mas comodo ver
              todo de corrido y guardar sin recorrer tres pantallas. */}
          {conPasos && (
            <div className="mb-6 flex items-center gap-2">
              {PASOS_PROYECTO.map((p, indice) => {
                const activo = paso === p.id;
                const cumplido = paso > p.id;
                return (
                  <div key={p.id} className="flex flex-1 items-center gap-2">
                    <button
                      type="button"
                      // Solo se puede volver atras; avanzar exige pasar la validacion
                      onClick={() => cumplido && setPaso(p.id)}
                      disabled={!cumplido}
                      className={`flex min-w-0 flex-1 flex-col gap-1.5 text-left ${cumplido ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`h-1 rounded-full transition-colors ${activo || cumplido ? 'bg-blue-600' : 'bg-[var(--color-surface-3)]'}`} />
                      <span className={`truncate text-xs ${activo ? 'font-medium text-[var(--color-text)]' : 'font-normal text-[var(--color-text-muted)]'}`}>
                        {indice + 1}. {t(p.labelKey)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Paso 1: lo basico ─────────────────────────────────────── */}
            {enPaso(1) && (
              <>
                {/* La plantilla va primero a proposito: rellena sola el area y la
                    descripcion, y para eso tiene que elegirse antes que ellas. */}
                {!proyecto && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-[var(--color-text-muted)]">{t('projectTemplateLabel')}</label>
                    <select
                      className="form-input form-select"
                      value={form.plantillaId}
                      onChange={e => {
                        const plantillaId = e.target.value;
                        const plantilla = plantillas.find(p => String(p.id) === plantillaId);
                        setForm(prev => ({
                          ...prev,
                          plantillaId,
                          descripcion: prev.descripcion || plantilla?.descripcion || '',
                          areas: prev.areas?.length ? prev.areas : getAreasProyecto(plantilla?.area),
                        }));
                      }}
                    >
                      <option value="">{t('projectTemplatePlaceholder')}</option>
                      {plantillas.map(plantilla => (
                        <option key={plantilla.id} value={plantilla.id}>
                          {plantilla.nombre} — {plantilla.totalTareas || plantilla._count?.tareas || plantilla.tareas?.length || 0} {t('projectTaskPlural')}
                        </option>
                      ))}
                    </select>
                    {!plantillaSeleccionada && (
                      <p className="text-xs font-normal text-[var(--color-text-muted)]">
                        {t('projectTemplateNoSelect')}
                      </p>
                    )}
                    {!plantillaSeleccionada && plantillas.length === 0 && (
                      <p className="text-xs font-normal text-amber-600">
                        {t('projectTemplateEmpty')}
                      </p>
                    )}
                    {plantillaSeleccionada && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                        <p className="text-sm font-medium text-[var(--color-text)]">{plantillaSeleccionada.nombre}</p>
                        <p className="text-xs font-normal text-[var(--color-text-muted)] mt-1">
                          {t('projectTemplateTasksBase', { count: plantillaSeleccionada.totalTareas || plantillaSeleccionada._count?.tareas || plantillaSeleccionada.tareas?.length || 0 })}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-muted)]">{t('projectFieldName')}</label>
                  <input className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder={t('projectFieldNamePlaceholder')} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-muted)]">{t('taskDescription')}</label>
                  <textarea className="form-input resize-none" rows="3" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder={t('projectFieldDescPlaceholder')} />
                </div>
              </>
            )}

            {/* ── Paso 2: responsables ──────────────────────────────────── */}
            {enPaso(2) && (
              <>
                {/* Areas y miembros van plegados: antes eran cuatro botones y
                    una tarjeta por area con todos los nombres a la vista, y solo
                    ese bloque ocupaba mas de una pantalla. */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-muted)]">{t('projectFieldArea')}</label>
                  <SelectorMultiple
                    placeholder={t('projectPickAreaShort')}
                    seleccionados={form.areas}
                    onToggle={toggleArea}
                    opciones={Object.keys(AREA_CONF).map((k) => ({
                      valor: k,
                      etiqueta: t(AREA_CONF[k]?.labelKey || 'areaGeneral'),
                      // Un admin de area solo puede crear proyectos de la suya
                      deshabilitada: esAdminArea && k !== usuarioActual?.area,
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-[var(--color-text-muted)]">{t('projectFieldMembers')}</label>
                    {consultandoDisponibilidad && <span className="text-xs font-medium text-blue-500">{t('projectCheckingCalendar')}</span>}
                  </div>
                  <SelectorMultiple
                    conBuscador
                    placeholder={t('projectPickMembersShort')}
                    vacioTexto={t('projectPickAreaFirst')}
                    seleccionados={form.miembrosIds}
                    onToggle={toggleMiembro}
                    opciones={usuariosPorArea.flatMap((grupo) => grupo.usuarios.map((u) => {
                      const conflictos = esAdminUsuario(u) ? [] : ocupados[u.id] || [];
                      const tieneProyectoActivo = conflictos.some(c => c.tipo === 'proyecto');
                      return {
                        valor: u.id,
                        etiqueta: u.nombre,
                        grupo: grupo.area === 'ADMIN' ? t('projectAdmins') : t(AREA_CONF[grupo.area]?.labelKey || 'areaGeneral'),
                        // Se avisa de quien ya esta en otro proyecto, pero no se
                        // bloquea: a veces se quiere igual y es decision del admin.
                        aviso: tieneProyectoActivo ? t('projectMemberInProject') : null,
                        titulo: conflictos.length > 0
                          ? t('projectHasBusyItems', { items: conflictos.map(c => c.titulo).join(', ') })
                          : '',
                      };
                    }))}
                  />
                </div>

                {/* Un solo calendario para inicio y fin. La lista aparte de
                    "Calendario de responsables" se quito: la misma informacion
                    se ve ahora sobre los propios dias, marcados o tachados. */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-muted)]">{t('projectDateRange')}</label>
                  <SelectorRangoFechas
                    desde={form.fechaInicio}
                    hasta={form.fechaFin}
                    onChange={({ desde, hasta }) => setForm({ ...form, fechaInicio: desde, fechaFin: hasta })}
                    bloqueadas={fechasBloqueadas}
                    esBloqueoDuro={esBloqueoReal}
                  />
                </div>
              </>
            )}

            {/* ── Paso 3: lo opcional ───────────────────────────────────── */}
            {enPaso(3) && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-muted)]">{t('projectFieldStatus')}</label>
                  {/* Switch solo para activo/inactivo, que es el uso diario.
                      Terminar y archivar viven en el menu de la tarjeta. */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {t(getEstadoProyecto(form.estado).labelKey)}
                    </span>
                    <Switch
                      checked={normalizarEstadoProyecto(form.estado) === 'ACTIVO'}
                      onCheckedChange={(activo) => setForm({ ...form, estado: activo ? 'ACTIVO' : 'INACTIVO' })}
                      aria-label={t('projectActiveSwitch')}
                    />
                  </div>
                </div>

                <TaskAttachments
                  tareaId={proyecto?.id}
                  type="proyectos"
                  title={t('projectFieldDocuments')}
                  pendingFiles={archivos}
                  onPendingFilesChange={setArchivos}
                  showUploader
                  showExisting={Boolean(proyecto?.id)}
                  uploadLabel={proyecto ? t('projectAddFiles') : t('projectSelectFiles')}
                />
              </>
            )}
          </form>
    </Modal>
  );
};

// ── Componente Principal ─────────────────────────────────────────────────────
const ProyectosPage = () => {
  const { t } = usePreferences();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const esAdmin = usuario?.rol?.toUpperCase() === 'ADMIN';

  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');
  const [area, setArea] = useState('TODAS');
  // Los archivados no se mezclan con el resto: o ves los vigentes o ves el
  // archivo. Por eso es un modo aparte y no una opcion mas del filtro de estado.
  const [verArchivados, setVerArchivados] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const busquedaDiferida = useDebounce(busqueda, 350);

  // La lista va por SWR: la clave incluye todos los filtros, asi que cada
  // combinacion se guarda por separado y volver a una ya vista es instantaneo.
  // Antes se pedia todo de cero en cada entrada y se quedaba en el esqueleto.
  const { data, isLoading, mutate } = useSWR(
    ['proyectos', busquedaDiferida, filtro, area, pagina, verArchivados],
    async ([, q, estado, areaClave, page, archivados]) => {
      // Busqueda, filtros y corte de pagina se resuelven en el servidor. Si se
      // filtrara aqui solo lo ya descargado, los totales y el numero de paginas
      // serian los de la pagina actual, no los de verdad.
      const respuesta = await proyectosService.listar({
        q,
        // En el archivo se ven solo los archivados. Fuera de el nunca aparecen:
        // "Todos" significa todo lo vigente, y el resto filtra por ese estado.
        ...(archivados
          ? { estado: 'ARCHIVADO' }
          : estado === 'TODOS' ? { excluirEstado: 'ARCHIVADO' } : { estado }),
        ...(areaClave !== 'TODAS' && { area: areaClave }),
        page,
        limit: PROYECTOS_POR_PAGINA
      });
      return { proyectos: sortProyectos(respuesta.proyectos), meta: respuesta.meta || null };
    },
    { onError: (err) => showToast(err.message, 'error') }
  );

  const proyectos = data?.proyectos || [];
  const meta = data?.meta || null;

  /** Si con el nuevo estado el proyecto ya no encaja aqui, tiene que irse. */
  const perteneceAVista = (estado) => (
    verArchivados
      ? estado === 'ARCHIVADO'
      : filtro === 'TODOS' ? estado !== 'ARCHIVADO' : estado === filtro
  );

  const handleEliminar = async (p) => {
    if (!window.confirm(t('projectDeleteConfirm', { name: p.nombre }))) return;
    mutate((actual) => actual && { ...actual, proyectos: actual.proyectos.filter(x => x.id !== p.id) }, { revalidate: false });
    try {
      await proyectosService.eliminar(p.id);
      showToast(t('projectDeleted'));
    } catch (err) { showToast(err.message, 'error'); }
    mutate();
  };

  // Terminar, reactivar y archivar. Se manda solo el estado: el backend deja el
  // resto de campos intactos porque el update es parcial.
  const handleCambiarEstado = async (p, nuevoEstado) => {
    const sigueVisible = perteneceAVista(nuevoEstado);

    // Al archivar, el proyecto desaparece de la lista en el acto. Antes solo se
    // le cambiaba la etiqueta y se quedaba ahi, como si no se hubiera archivado.
    mutate((actual) => actual && {
      ...actual,
      proyectos: sigueVisible
        ? actual.proyectos.map(x => (x.id === p.id ? { ...x, estado: nuevoEstado } : x))
        : actual.proyectos.filter(x => x.id !== p.id)
    }, { revalidate: false });

    try {
      const formData = new FormData();
      formData.append('estado', nuevoEstado);
      await proyectosService.editar(p.id, formData);
      showToast(t(ESTADOS_PROYECTO.find(e => e.value === nuevoEstado)?.labelKey || 'statusActive'));
    } catch (err) {
      showToast(err.message, 'error');
    }

    // Se vuelve a pedir en cualquier caso: si salio de la vista cambian el total
    // y el corte de pagina, y si fallo hay que deshacer el cambio optimista.
    mutate();
  };

  // Al cambiar cualquier filtro hay que volver a la pagina 1: si estabas en la
  // 4 y el nuevo filtro solo tiene 2 paginas, te quedarias viendo una vacia.
  const cambiarFiltro = (accion) => { accion(); setPagina(1); };

  const totalPaginas = meta?.totalPages || 1;
  const hayFiltros = Boolean(busqueda) || filtro !== 'TODOS' || area !== 'TODAS';

  // El esqueleto sale solo cuando no hay absolutamente nada que mostrar. Al
  // buscar o cambiar de pagina se conserva lo anterior (keepPreviousData), asi
  // el input no se desmonta y no se pierde el foco al escribir.
  if (isLoading && !data) return <PageSkeleton cards={3} />;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6">
        <div>
          <h1 className="text-3xl lg:text-5xl font-semibold text-[var(--color-text)] tracking-tight leading-none mb-2">{t('projectsPageTitle')}</h1>
          <p className="text-sm lg:text-base text-[var(--color-text-muted)] font-normal">{t('projectsPageSubtitle')}</p>
        </div>
        {esAdmin && (
          <button 
            onClick={() => { setEditando(null); setModal(true); }} 
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> {t('projectsNewProject')}
          </button>
        )}
      </div>

      {/* Buscador y filtros en una sola fila. Los tres van al servidor, para que
          la paginacion cuente sobre el resultado real y no sobre lo descargado. */}
      {/* Regla general del sistema: la etiqueta va ENCIMA del control, nunca a
          su lado. Asi los filtros no se estiran en una sola linea larga y todos
          quedan a la misma altura aunque tengan anchos distintos. */}
      <div className="mb-8 flex flex-wrap items-end gap-3">
        <CampoFiltro label={t('search')} className="min-w-[240px] flex-1 max-w-xl">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none">
              <Search size={18} />
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => cambiarFiltro(() => setBusqueda(e.target.value))}
              placeholder={t('projectSearchPlaceholder')}
              aria-label={t('projectSearchPlaceholder')}
              className="w-full h-11 pl-11 pr-11 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-normal text-[var(--color-text)] outline-none transition-all focus:border-blue-500"
            />
            {busqueda && (
              <Tooltip label={t('clearSearch')}>
                <button
                  type="button"
                  onClick={() => cambiarFiltro(() => setBusqueda(''))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
                >
                  <Plus size={16} className="rotate-45" />
                </button>
              </Tooltip>
            )}
          </div>
        </CampoFiltro>

        {/* En el archivo el filtro de estado no aplica: ahi todo esta archivado */}
        {!verArchivados && (
          <CampoFiltro label={t('projectFieldStatus')}>
            <Select value={filtro} onValueChange={(v) => cambiarFiltro(() => setFiltro(v))}>
              <SelectTrigger className="h-11 w-[170px] text-sm font-normal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1500]">
                <SelectItem value="TODOS" className="text-sm font-normal">{t('projectFilterAll')}</SelectItem>
                {ESTADOS_PROYECTO.filter((e) => e.value !== 'ARCHIVADO').map((e) => (
                  <SelectItem key={e.value} value={e.value} className="text-sm font-normal">{t(e.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFiltro>
        )}

        <CampoFiltro label={t('projectFieldArea')}>
          <Select value={area} onValueChange={(v) => cambiarFiltro(() => setArea(v))}>
            <SelectTrigger className="h-11 w-[190px] text-sm font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1500]">
              <SelectItem value="TODAS" className="text-sm font-normal">{t('projectFilterAllAreas')}</SelectItem>
              {Object.entries(AREA_CONF).map(([clave, conf]) => (
                <SelectItem key={clave} value={clave} className="text-sm font-normal">{t(conf.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CampoFiltro>


        <Button
          variant={verArchivados ? 'default' : 'outline'}
          className="h-11"
          onClick={() => cambiarFiltro(() => setVerArchivados((v) => !v))}
        >
          {verArchivados ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          {verArchivados ? t('projectBackToActive') : t('projectViewArchived')}
        </Button>
      </div>

      {/* Aviso de que estas en el archivo, para que no parezca que la lista
          normal se vacio. */}
      {verArchivados && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-[var(--color-surface-3)] px-4 py-3 text-sm font-normal text-[var(--color-text-dim)]">
          <Archive size={16} />
          {t('projectArchivedNotice')}
        </div>
      )}

      {proyectos.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[32px] p-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200">
            <FolderOpen size={40} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-1">
              {hayFiltros ? t('searchNoResults') : t('projectNoResultsTitle')}
            </h3>
            <p className="text-sm text-slate-500 font-normal">
              {busqueda ? `"${busqueda}"` : t('projectNoResultsSubtitle')}
            </p>
          </div>
        </div>
      ) : (
          <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proyectos.map(p => (
            <ProyectoCard 
              key={p.id} proyecto={p} esAdmin={esAdmin} 
              onEditar={(p) => { setEditando(p); setModal(true); }}
              onEliminar={handleEliminar}
              onCambiarEstado={handleCambiarEstado}
              onVerDetalle={() => navigate(`/proyectos/${p.id}`)}
              />
            ))}
          </div>

          {/* Paginacion. Se oculta si todo cabe en una sola pagina. */}
          {totalPaginas > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm font-normal text-[var(--color-text-muted)]">
                {t('timelineRange', {
                  desde: (meta.page - 1) * meta.limit + 1,
                  hasta: Math.min(meta.page * meta.limit, meta.total),
                  total: meta.total
                })}
              </span>
              <div className="flex items-center gap-2">
            <Tooltip label={t('previous')}>
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPagina((n) => Math.max(1, n - 1))} disabled={!meta.hasPrev}>
                    <ChevronLeft size={16} />
                  </Button>
                </Tooltip>
                <span className="text-sm font-medium text-[var(--color-text)] min-w-[70px] text-center">
                  {meta.page} / {totalPaginas}
                </span>
            <Tooltip label={t('next')}>
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setPagina((n) => n + 1)} disabled={!meta.hasNext}>
                    <ChevronRight size={16} />
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}
          </>
      )}

      {modal && <ModalProyecto proyecto={editando} onClose={() => setModal(false)} onGuardar={() => { setModal(false); mutate(); }} />}
    </div>
  );
};

export default ProyectosPage;
