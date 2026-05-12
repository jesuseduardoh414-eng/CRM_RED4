// Página de detalle de un Proyecto
// Muestra info del proyecto, barra de progreso, contadores y lista de tareas
// Vistas: Lista | Kanban | Gantt | Muro

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tareasService, usuariosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import KanbanView from '../components/KanbanView';
import GanttView  from '../components/GanttView';
import Spinner    from '../components/Spinner';
import TaskComments from '../components/TaskComments';
import ProjectActivityLog from '../components/ProjectActivityLog';
import TaskAttachments from '../components/TaskAttachments';
import ModalImportar from '../components/ModalImportar';
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
  List,
  LayoutGrid,
  CalendarRange,
  ChevronLeft,
  AlertCircle
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

// ── Tarjeta de Tarea (List View) ─────────────────────────────────────────────
const TareaCard = ({ tarea, onClick, onEditar, onEliminar, onCambiarEstado }) => {
  const prio = getPrioridad(tarea.prioridad);
  const estado = getEstadoConf(tarea.estado);
  const CICLO = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];
  const sigEstado = CICLO[(CICLO.indexOf(tarea.estado) + 1) % CICLO.length];
  const vencido = tarea.venceEn && new Date(tarea.venceEn) < new Date() && tarea.estado !== 'HECHO';

  return (
    <div 
      onClick={() => onClick(tarea)}
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: '1rem',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        transition: 'all 0.2s',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)'
      }}
      onMouseOver={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
        e.currentTarget.style.transform = 'translateX(4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Icono de Estado */}
      <div style={{ 
        width: '12px', height: '12px', borderRadius: '50%', background: estado.color, 
        boxShadow: `0 0 10px ${estado.color}55`, flexShrink: 0 
      }} />

      {/* Info Principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h4 style={{ 
            fontSize: '1.05rem', fontWeight: '700', 
            textDecoration: tarea.estado === 'HECHO' ? 'line-through' : 'none',
            opacity: tarea.estado === 'HECHO' ? 0.5 : 1
          }}>
            {tarea.titulo}
          </h4>
          <span style={{ fontSize: '0.65rem', fontWeight: '800', background: prio.bg, color: prio.color, padding: '0.15rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase' }}>
            {prio.label}
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tarea.descripcion || 'Sin descripción'}
        </p>
      </div>

      {/* Asignado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '160px' }}>
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '10px', background: 'var(--color-surface-3)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-primary-light)'
        }}>
          {tarea.asignado?.nombre?.charAt(0) || '?'}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
          {tarea.asignado?.nombre?.split(' ')[0] || 'S/A'}
        </div>
      </div>

      {/* Fecha */}
      <div style={{ width: '100px', textAlign: 'right', fontSize: '0.85rem', color: vencido ? 'var(--color-error)' : 'var(--color-text-muted)', fontWeight: '600' }}>
        {tarea.venceEn ? (vencido ? '⚠️ ' : '') + formatFecha(tarea.venceEn) : '—'}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={(e) => { e.stopPropagation(); onCambiarEstado(tarea.id, sigEstado); }}
          style={{ 
            background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', 
            color: 'var(--color-text)', padding: '0.5rem', borderRadius: '0.5rem', 
            cursor: 'pointer', transition: 'var(--transition-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Avanzar estado"
          onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-base)'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
        >
          {tarea.estado === 'HECHO' ? <RotateCcw size={16} /> : <ArrowRight size={16} />}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onEliminar(tarea); }}
          style={{ 
            background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', 
            color: 'var(--color-accent-error)', padding: '0.5rem', borderRadius: '0.5rem', 
            cursor: 'pointer', transition: 'var(--transition-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ── Toggle Vista (Material) ─────────────────────────────────────────────────
const ToggleVista = ({ vista, onChange }) => (
  <div style={{ 
    display: 'flex', background: 'var(--color-surface-2)', padding: '0.35rem', borderRadius: '1rem', border: '1px solid var(--color-border)', gap: '0.25rem' 
  }}>
    {[
      { k: 'lista',  l: 'Lista', i: <List size={16} /> },
      { k: 'kanban', l: 'Kanban', i: <LayoutGrid size={16} /> },
      { k: 'gantt',  l: 'Gantt', i: <CalendarRange size={16} /> }
    ].map(v => (
      <button 
        key={v.k} onClick={() => onChange(v.k)}
        style={{
          padding: '0.5rem 1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
          background: vista === v.k ? 'var(--color-primary)' : 'transparent',
          color: vista === v.k ? '#fff' : 'var(--color-text-muted)',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}
      >
        {v.i} {v.l}
      </button>
    ))}
  </div>
);

// ── Main Page Component ─────────────────────────────────────────────────────
const ProyectoDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMIN';
  const { showToast } = useToast();

  const [proyecto, setProyecto] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [tareaEditando, setTareaEditando] = useState(null);
  const [vista, setVista] = useState('lista');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [t, u] = await Promise.all([tareasService.listar(id), usuariosService.listar()]);
      setProyecto(t.proyecto);
      setTareas(t.tareas);
      setUsuarios(u.usuarios);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setCargando(false); }
  }, [id, showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const stats = {
    total: tareas.length,
    hechas: tareas.filter(t => t.estado === 'HECHO').length,
    progreso: tareas.filter(t => t.estado === 'EN_PROGRESO').length,
    pendientes: tareas.filter(t => t.estado === 'PENDIENTE').length,
    pct: tareas.length > 0 ? Math.round((tareas.filter(t => t.estado === 'HECHO').length / tareas.length) * 100) : 0
  };

  const handleEliminar = async (t) => {
    if (!window.confirm(`¿Eliminar "${t.titulo}"?`)) return;
    try {
      await tareasService.eliminar(t.id);
      setTareas(prev => prev.filter(x => x.id !== t.id));
      showToast('Tarea eliminada');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleCambiarEstado = async (id, est) => {
    try {
      const { tarea } = await tareasService.actualizarEstado(id, est);
      setTareas(prev => prev.map(x => x.id === id ? tarea : x));
    } catch (err) { showToast(err.message, 'error'); }
  };

  if (cargando) return <Spinner texto="Cargando entorno..." />;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Premium */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Link to="/proyectos" style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ChevronLeft size={16} /> PROYECTOS
            </Link>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>/</span>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>ID #{proyecto?.id}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.75rem' }}>{proyecto?.nombre}</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', maxWidth: '600px' }}>{proyecto?.descripcion}</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setModalImportar(true)} 
            style={{ 
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', 
              color: 'var(--color-text)', borderRadius: '12px', padding: '0.75rem 1.25rem',
              fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'var(--transition-base)', boxShadow: 'var(--shadow-sm)'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-bg-base)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-surface)'; }}
          >
            <Download size={18} /> Importar
          </button>
          <button onClick={() => { setTareaEditando(null); setModal(true); }} className="btn-primary" style={{ borderRadius: '12px', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {[
          { l: 'Progreso General', v: `${stats.pct}%`, i: <Target size={24} />, c: 'var(--color-primary)', bg: '#eff6ff' },
          { l: 'Por Hacer', v: stats.pendientes, i: <ListTodo size={24} />, c: '#64748b', bg: '#f8fafc' },
          { l: 'En Marcha', v: stats.progreso, i: <Zap size={24} />, c: '#8b5cf6', bg: '#f5f3ff' },
          { l: 'Finalizadas', v: stats.hechas, i: <CheckCircle2 size={24} />, c: '#10b981', bg: '#f0fdf4' }
        ].map((s, i) => (
          <div key={i} className="card" style={{ 
            padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: 'none', borderRadius: '24px', background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</div>
              {s.l === 'Progreso General' && (
                <div style={{ width: '80px', height: '6px', background: '#f1f5f9', borderRadius: '10px', marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stats.pct}%`, background: 'var(--color-primary)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </div>
              )}
            </div>
            <div style={{ 
              width: '52px', height: '52px', borderRadius: '14px', background: s.bg, 
              color: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {s.i}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar Vistas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <ToggleVista vista={vista} onChange={setVista} />
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-dim)' }}>Mostrando {tareas.length} tareas</span>
          {/* Aquí podrían ir filtros adicionales */}
        </div>
      </div>

      {/* Content Canvas */}
      <div style={{ minHeight: '500px' }}>
        {vista === 'lista' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tareas.map(t => (
              <TareaCard 
                key={t.id} 
                tarea={t} 
                onClick={(x) => { setTareaEditando(x); setModal(true); }}
                onEditar={(x) => { setTareaEditando(x); setModal(true); }}
                onEliminar={handleEliminar}
                onCambiarEstado={handleCambiarEstado}
              />
            ))}
          </div>
        )}
        {vista === 'kanban' && <KanbanView tareas={tareas} onClick={(x) => { setTareaEditando(x); setModal(true); }} onCambiarEstado={handleCambiarEstado} onEditar={(x) => { setTareaEditando(x); setModal(true); }} />}
        {vista === 'gantt' && <GanttView proyecto={proyecto} tareas={tareas} />}
      </div>

      {/* Modales */}
      {modal && (
        <ModalTarea 
          tarea={tareaEditando} 
          proyectoId={id} 
          usuarios={usuarios} 
          onClose={() => setModal(false)} 
          onGuardar={() => { setModal(false); cargar(); }} 
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
    </div>
  );
};

// ── Modal de Tarea (Simplified & Professional) ──────────────────────────────
const ModalTarea = ({ tarea, proyectoId, usuarios, onClose, onGuardar }) => {
  const [form, setForm] = useState({
    titulo: tarea?.titulo || '',
    descripcion: tarea?.descripcion || '',
    asignadoId: tarea?.asignado?.id || '',
    prioridad: tarea?.prioridad || 'MEDIA',
    estado: tarea?.estado || 'PENDIENTE',
    fechaInicio: tarea?.fechaInicio ? tarea.fechaInicio.slice(0,10) : new Date().toISOString().slice(0,10),
    venceEn: tarea?.venceEn ? tarea.venceEn.slice(0,10) : ''
  });
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (tarea) {
        await tareasService.editar(tarea.id, form);
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k,v]) => fd.append(k,v));
        await tareasService.crear(proyectoId, fd);
      }
      onGuardar();
    } catch (err) { alert(err.message); }
    finally { setCargando(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface-2)', padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '2rem' }}>{tarea ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">TÍTULO DE LA TAREA</label>
            <input className="form-input" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required placeholder="¿Qué hay que hacer?" />
          </div>

          <div className="form-group">
            <label className="form-label">DESCRIPCIÓN</label>
            <textarea className="form-input" rows="3" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Detalles adicionales..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">ASIGNADO A</label>
              <select className="form-input form-select" value={form.asignadoId} onChange={e => setForm({...form, asignadoId: e.target.value})}>
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">PRIORIDAD</label>
              <select className="form-input form-select" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">ESTADO</label>
              <select className="form-input form-select" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                {ESTADOS_TAREA.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">FECHA INICIO</label>
              <input type="date" className="form-input" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} style={{ colorScheme: 'dark' }} />
            </div>
            <div className="form-group">
              <label className="form-label">FECHA LÍMITE</label>
              <input type="date" className="form-input" value={form.venceEn} onChange={e => setForm({...form, venceEn: e.target.value})} style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '0.8rem', borderRadius: '0.85rem', cursor: 'pointer', fontWeight: '700' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={cargando}>{cargando ? 'GUARDANDO...' : 'GUARDAR TAREA'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProyectoDetallePage;
