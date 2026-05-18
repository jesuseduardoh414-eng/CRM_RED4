// Página de detalle de un Proyecto
// Muestra info del proyecto, barra de progreso, contadores y lista de tareas
// Vistas: Lista | Kanban | Gantt | Muro

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proyectosService, tareasService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import KanbanView from '../components/KanbanView';
import GanttView  from '../components/GanttView';
import { PageSkeleton } from '../components/Skeleton';
import ModalImportar from '../components/ModalImportar';
import RangeDatePicker from '../components/RangeDatePicker';
import { sortTareas, sortTareasLista } from '../utils/sorters';
import { 
  Target, 
  ListTodo, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Trash2, 
  Download, 
  Plus,
  Save,
  FileJson,
  FileSpreadsheet,
  List,
  LayoutGrid,
  CalendarRange,
  ChevronLeft,
  AlertTriangle,
  Search
} from 'lucide-react';

// ── Configuraciones ─────────────────────────────────────────────────────────
const PRIORIDADES = [
  { value: 'BAJA',  label: 'Baja',  color: '#00a2ff', bg: 'rgba(0,162,255,0.1)' },
  { value: 'MEDIA', label: 'Media', color: '#ff9100', bg: 'rgba(255,145,0,0.1)' },
  { value: 'ALTA',  label: 'Alta',  color: '#ff0055', bg: 'rgba(255,0,85,0.1)' },
];

const ESTADOS_TAREA = [
  { value: 'PENDIENTE',   label: 'Por hacer',   color: '#6c757d' },
  { value: 'EN_PROGRESO', label: 'En progreso', color: '#00a2ff' },
  { value: 'HECHO',       label: 'Hecho',       color: '#00d166'  },
];

const getPrioridad  = (v) => PRIORIDADES.find(p => p.value === v) || PRIORIDADES[1];
const getEstadoConf = (v) => ESTADOS_TAREA.find(e => e.value === v) || ESTADOS_TAREA[0];

const formatFecha = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const inicioDiaLocal = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getHoyMediodiaIso = () => {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  return hoy.toISOString();
};

const getVenceEnOptimista = (tarea, nuevoEstado) => {
  if (!tarea?.venceEn) return tarea?.venceEn;
  if (nuevoEstado === 'HECHO') return getHoyMediodiaIso();
  return inicioDiaLocal(tarea.venceEn) < inicioDiaLocal(new Date())
    ? getHoyMediodiaIso()
    : tarea.venceEn;
};

// ── Tarjeta de Tarea (List View) ─────────────────────────────────────────────
const TareaCard = ({ tarea, onClick, onEliminar, onCambiarEstado }) => {
  const prio = getPrioridad(tarea.prioridad);
  const estado = getEstadoConf(tarea.estado);
  const CICLO = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];
  const sigEstado = CICLO[(CICLO.indexOf(tarea.estado) + 1) % CICLO.length];
  const vencido = tarea.venceEn && new Date(tarea.venceEn) < new Date() && tarea.estado !== 'HECHO';

  return (
    <div 
      onClick={() => onClick(tarea)}
      className="bg-white border border-slate-100 p-4 lg:p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 hover:translate-x-1 transition-all cursor-pointer shadow-sm hover:shadow-md"
    >
      {/* Icono de Estado y Título */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full shrink-0 mt-1.5" 
          style={{ background: estado.color, boxShadow: `0 0 10px ${estado.color}55` }} 
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className={`text-sm lg:text-base font-bold text-slate-900 truncate ${tarea.estado === 'HECHO' ? 'line-through opacity-40' : ''}`}>
              {tarea.titulo}
            </h4>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ background: prio.bg, color: prio.color }}>
              {prio.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate font-medium">
            {tarea.descripcion || 'Sin descripción'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-50">
        {/* Asignado */}
        <div className="flex items-center gap-2 lg:w-32 shrink-0">
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
            {tarea.asignado?.nombre?.charAt(0) || '?'}
          </div>
          <div className="text-xs font-bold text-slate-600 hidden lg:block">
            {tarea.asignado?.nombre?.split(' ')[0] || 'S/A'}
          </div>
        </div>

        {/* Fecha */}
        <div className={`text-[10px] lg:text-xs font-black shrink-0 flex items-center gap-1 ${vencido ? 'text-red-500' : 'text-slate-400'}`}>
          {tarea.venceEn ? (
            <>
              {vencido && <AlertTriangle size={12} />}
              {formatFecha(tarea.venceEn)}
            </>
          ) : '—'}
        </div>

        <div className="flex gap-2 ml-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onCambiarEstado(tarea.id, sigEstado); }}
            className="p-2 lg:p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
          >
            {tarea.estado === 'HECHO' ? <RotateCcw size={14} /> : <ArrowRight size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEliminar(tarea); }}
            className="p-2 lg:p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Toggle Vista (Material) ─────────────────────────────────────────────────
const ToggleVista = ({ vista, onChange }) => (
  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 w-full lg:w-auto">
    {[
      { k: 'lista',  l: 'Lista', i: <List size={16} /> },
      { k: 'kanban', l: 'Kanban', i: <LayoutGrid size={16} /> },
      { k: 'gantt',  l: 'Gantt', i: <CalendarRange size={16} /> }
    ].map(v => (
      <button 
        key={v.k} onClick={() => onChange(v.k)}
        className={`
          flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs lg:text-sm font-black transition-all
          ${vista === v.k ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-white'}
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
  const { usuario } = useAuth();
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
  const [limite, setLimite] = useState(10);

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

  const stats = useMemo(() => {
    const hechas = tareas.filter(t => t.estado === 'HECHO').length;
    const prog = tareas.filter(t => t.estado === 'EN_PROGRESO').length;
    const pendientes = tareas.filter(t => t.estado === 'PENDIENTE').length;
    const total = tareas.length;
    const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;

    const tareasMiembro = tareas.filter(t => t.asignado?.id === usuario?.id);
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
  const progresoMiembro = stats.pctMiembro;
  const totalGeneral = stats.total;
  const totalMiembro = stats.totalMiembro;

  const tareasFiltradas = useMemo(() => {
    if (!busqueda) return tareas;
    const b = busqueda.toLowerCase();
    return tareas.filter(t => 
      t.titulo?.toLowerCase().includes(b) || 
      t.descripcion?.toLowerCase().includes(b)
    );
  }, [tareas, busqueda]);

  const tareasListaFiltradas = useMemo(() => sortTareasLista(tareasFiltradas), [tareasFiltradas]);

  const handleEliminar = async (t) => {
    if (!window.confirm(`¿Eliminar "${t.titulo}"?`)) return;
    try {
      await tareasService.eliminar(t.id);
      setTareas(prev => prev.filter(x => x.id !== t.id));
      showToast('Tarea eliminada');
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
      setTareas(prev => sortTareas(prev.map(x => x.id === id ? tarea : x)));
      if (tareaEditando?.id === id) {
        setTareaEditando(tarea);
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
      showToast('Tarea actualizada');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleExportar = (tipo) => {
    try {
      tareasService.exportarProyecto(id, tipo);
      showToast(`Exportación ${tipo.toUpperCase()} iniciada`);
      setModalExportar(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleGuardarPlantilla = async ({ nombre, descripcion }) => {
    try {
      await proyectosService.guardarComoPlantilla(id, { nombre, descripcion });
      showToast('Plantilla guardada correctamente');
      setModalPlantilla(false);
    } catch (err) {
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
            <Link to="/proyectos" className="text-blue-600 font-black text-[10px] lg:text-xs tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
              <ChevronLeft size={14} /> PROYECTOS
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[10px] font-black text-slate-400 tracking-widest truncate max-w-[200px]">ID #{proyecto?.id}</span>
          </div>
          <h1 className="text-2xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            {proyecto?.nombre}
          </h1>
          <p className="text-sm lg:text-base text-slate-500 font-medium max-w-2xl">{proyecto?.descripcion}</p>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={() => setModalExportar(true)} 
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 lg:py-3.5 bg-white border border-slate-200 rounded-xl text-xs lg:text-sm font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} /> Exportar
          </button>
          {usuario?.rol === 'ADMIN' && (
            <button 
              onClick={() => setModalPlantilla(true)} 
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 lg:py-3.5 bg-white border border-slate-200 rounded-xl text-xs lg:text-sm font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Save size={18} /> Guardar Plantilla
            </button>
          )}
          <button 
            onClick={() => setModalImportar(true)} 
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 lg:py-3.5 bg-white border border-slate-200 rounded-xl text-xs lg:text-sm font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} /> Importar
          </button>
          <button 
            onClick={() => { setTareaEditando(null); setModal(true); }} 
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 lg:py-3.5 bg-blue-600 text-white rounded-xl text-xs lg:text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10 overflow-x-auto pb-2 lg:pb-0">
        {[
          { l: 'Progreso general', v: `${progresoGeneral}%`, sub: `${totalGeneral} tareas`, i: <Target size={24} />, c: '#2563eb', bg: '#eff6ff' },
          { l: 'Mi progreso', v: `${progresoMiembro}%`, sub: `${totalMiembro} asignadas`, i: <Target size={24} />, c: '#10b981', bg: '#f0fdf4' },
          { l: 'Por Hacer', v: stats.pendientes, i: <ListTodo size={24} />, c: '#64748b', bg: '#f8fafc' },
          { l: 'En Marcha', v: stats.progreso, i: <Zap size={24} />, c: '#8b5cf6', bg: '#f5f3ff' },
          { l: 'Hechas', v: stats.hechas, i: <CheckCircle2 size={24} />, c: '#10b981', bg: '#f0fdf4' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 lg:p-6 rounded-[24px] shadow-sm border border-slate-50 flex items-center justify-between min-w-[140px]">
            <div className="flex flex-col gap-0.5">
              <div className="text-xl lg:text-2xl font-black text-slate-900 leading-none">{s.v}</div>
              <div className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.l}</div>
              {s.sub && <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{s.sub}</div>}
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.c }}>
              {s.i}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar Vistas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <ToggleVista vista={vista} onChange={setVista} />
          
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)', opacity: 0.5 }} />
            <input 
              type="text"
              placeholder="Buscar tareas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.5rem',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: '600',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mostrando {tareasFiltradas.length} {tareasFiltradas.length === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>
      </div>

      {/* Content Canvas */}
      <div style={{ minHeight: '500px' }}>
        {vista === 'lista' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem', 
              maxHeight: '70vh', 
              overflowY: 'auto',
              paddingRight: '0.5rem',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border) transparent'
            }}>
              {tareasListaFiltradas.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: '1.5rem', border: '1px dashed var(--color-border)', color: 'var(--color-text-dim)' }}>
                  <Search size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                  <p style={{ fontWeight: '700' }}>No se encontraron tareas que coincidan con tu búsqueda</p>
                </div>
              ) : (
                tareasListaFiltradas.slice(0, limite).map(t => (
                  <TareaCard 
                    key={t.id} 
                    tarea={t} 
                    onClick={(x) => { setTareaEditando(x); setModal(true); }}
                    onEliminar={handleEliminar}
                    onCambiarEstado={handleCambiarEstado}
                  />
                ))
              )}
            </div>
            
            {tareasListaFiltradas.length > limite && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                <button 
                  onClick={() => setLimite(prev => prev + 10)}
                  className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm uppercase tracking-widest flex items-center gap-2"
                >
                  Ver más tareas ({tareasFiltradas.length - limite} restantes) <Plus size={14} />
                </button>
              </div>
            )}
          </div>
        )}
        {vista === 'kanban' && <KanbanView tareas={tareasFiltradas} onClick={(x) => { setTareaEditando(x); setModal(true); }} onEliminar={handleEliminar} onCambiarEstado={handleCambiarEstado} onEditar={(x) => { setTareaEditando(x); setModal(true); }} onActualizarTarea={handleActualizarTarea} />}
        {vista === 'gantt' && <GanttView proyecto={proyecto} tareas={tareasFiltradas} />}
      </div>

      {/* Modales */}
      {modal && (
        <ModalTarea 
          tarea={tareaEditando} 
          proyectoId={id} 
          usuarios={usuarios} 
          onClose={() => setModal(false)} 
          onGuardar={() => { setModal(false); cargar(); }} 
          onEliminar={handleEliminar}
        />
      )}
      {modalImportar && (
        <ModalImportar 
          proyectoId={id} 
          usuarios={usuarios} 
          usuarioActual={usuario}
          onClose={() => setModalImportar(false)} 
          onImportado={() => { setModalImportar(false); cargar(); }} 
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
const ModalTarea = ({ tarea, proyectoId, usuarios, onClose, onGuardar, onEliminar }) => {
  const [form, setForm] = useState({
    titulo: tarea?.titulo || '',
    descripcion: tarea?.descripcion || '',
    numeroActividad: tarea?.numeroActividad || '',
    asignadoId: tarea?.asignado?.id || '',
    prioridad: tarea?.prioridad || 'MEDIA',
    estado: tarea?.estado || 'PENDIENTE',
    fechaInicio: tarea?.fechaInicio ? tarea.fechaInicio.slice(0,10) : new Date().toISOString().slice(0,10),
    venceEn: tarea?.venceEn ? tarea.venceEn.slice(0,10) : ''
  });
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (tarea) {
        await tareasService.editar(tarea.id, form);
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k,v]) => fd.append(k,v));
        archivos.forEach((file) => fd.append('archivos', file));
        await tareasService.crear(proyectoId, fd);
      }
      onGuardar();
    } catch (err) { alert(err.message); }
    finally { setCargando(false); }
  };

  return (
    <div 
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-end lg:items-center justify-center p-0 lg:p-4 transition-all"
    >
      <div className="bg-white w-full max-w-2xl rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] lg:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-10">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">{tarea ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors border border-transparent hover:border-slate-100">
            <Zap size={20} className="rotate-45" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TÍTULO DE LA TAREA</label>
              <input 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" 
                value={form.titulo} 
                onChange={e => setForm({...form, titulo: e.target.value})} 
                required 
                placeholder="¿Qué hay que hacer?" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DESCRIPCIÓN</label>
              <textarea 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none" 
                rows="3" 
                value={form.descripcion} 
                onChange={e => setForm({...form, descripcion: e.target.value})} 
                placeholder="Detalles adicionales..." 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NUMERO DE ACTIVIDAD</label>
              <input
                type="number"
                min="1"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                value={form.numeroActividad}
                onChange={e => setForm({ ...form, numeroActividad: e.target.value })}
                placeholder="Ej. 10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ASIGNADO A</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none appearance-none" value={form.asignadoId} onChange={e => setForm({...form, asignadoId: e.target.value})}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESTADO</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                  {ESTADOS_TAREA.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PRIORIDAD</label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                  {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DURACIÓN (INICIO - FIN)</label>
                <RangeDatePicker 
                  from={form.fechaInicio ? new Date(form.fechaInicio + 'T12:00:00') : null}
                  to={form.venceEn ? new Date(form.venceEn + 'T12:00:00') : null}
                  onChange={(range) => {
                    setForm({
                      ...form,
                      fechaInicio: range?.from ? range.from.toISOString().slice(0, 10) : '',
                      venceEn: range?.to ? range.to.toISOString().slice(0, 10) : ''
                    });
                  }}
                />
              </div>
            </div>

            {!tarea && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DOCUMENTOS DE APOYO</label>
                <div className="relative group">
                  <input
                    type="file"
                    multiple
                    onChange={e => setArchivos(prev => [...prev, ...Array.from(e.target.files || [])])}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-3 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl group-hover:border-blue-400 transition-all">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-blue-500">
                      <Plus size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Haz clic para subir documentos</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Se permite cualquier tipo de archivo</p>
                    </div>
                  </div>
                </div>

                {archivos.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {archivos.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSpreadsheet size={16} className="text-blue-500 shrink-0" />
                          <span className="text-[10px] font-black text-slate-600 truncate">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setArchivos(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"
                        >
                          <Plus size={16} className="rotate-45" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse lg:flex-row gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 px-6 py-4 rounded-2xl text-xs font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest"
          >
            Cancelar
          </button>
          {tarea && (
            <button 
              type="button" 
              onClick={() => { onEliminar(tarea); onClose(); }}
              className="flex-1 px-6 py-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all"
            >
              Eliminar
            </button>
          )}
          <button onClick={handleSubmit} className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50" disabled={cargando}>
            {cargando ? 'Guardando...' : 'Guardar Tarea'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalExportarProyecto = ({ proyecto, onClose, onExportar }) => (
  <div
    onClick={(e) => e.target === e.currentTarget && onClose()}
    className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-end lg:items-center justify-center p-0 lg:p-4"
  >
    <div className="bg-white w-full max-w-md rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-black text-slate-900">Exportar tareas</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">{proyecto?.nombre}</p>
      </div>
      <div className="px-8 py-6 space-y-3">
        <button
          onClick={() => onExportar('excel')}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"
        >
          <span className="flex items-center gap-3 text-sm font-black text-slate-800"><FileSpreadsheet size={18} /> Excel</span>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">.xlsx</span>
        </button>
        <button
          onClick={() => onExportar('json')}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"
        >
          <span className="flex items-center gap-3 text-sm font-black text-slate-800"><FileJson size={18} /> JSON</span>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">.json</span>
        </button>
      </div>
      <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50">
        <button onClick={onClose} className="w-full px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
          Cerrar
        </button>
      </div>
    </div>
  </div>
);

const ModalGuardarPlantilla = ({ proyecto, onClose, onGuardar }) => {
  const [form, setForm] = useState({
    nombre: `${proyecto?.nombre || 'Proyecto'} Template`,
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
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-end lg:items-center justify-center p-0 lg:p-4"
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900">Guardar como plantilla</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Esto guarda una base reutilizable del proyecto actual: tareas, prioridades, orden, dependencias y fechas relativas. No guarda el avance real ni el historial.</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la plantilla</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none resize-none"
              rows="3"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div className="flex flex-col-reverse lg:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl text-xs font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
              {guardando ? 'Guardando...' : 'Guardar plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProyectoDetallePage;
