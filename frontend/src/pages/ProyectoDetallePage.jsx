// Página de detalle de un Proyecto
// Muestra info del proyecto, barra de progreso, contadores y lista de tareas
// Vistas: Lista | Kanban | Gantt

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

// ── Configuraciones ─────────────────────────────────────────────────────────
const AREA_CONFIG = {
  DESARROLLO:     { label: 'Desarrollo',     color: '#6366f1', bg: 'rgba(99,102,241,0.08)'  },
  ADMINISTRACION: { label: 'Administración', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
  COMUNICACION:   { label: 'Comunicación',   color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
};

const PRIORIDADES = [
  { value: 'BAJA',  label: 'Baja',  color: '#4ade80' },
  { value: 'MEDIA', label: 'Media', color: '#fbbf24' },
  { value: 'ALTA',  label: 'Alta',  color: '#f87171' },
];

const ESTADOS_TAREA = [
  { value: 'PENDIENTE',   label: 'Por hacer',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  { value: 'EN_PROGRESO', label: 'En progreso', color: '#818cf8', bg: 'rgba(129,140,248,0.08)' },
  { value: 'HECHO',       label: 'Hecho',       color: '#34d399', bg: 'rgba(52,211,153,0.08)'  },
];

const getPrioridad  = (v) => PRIORIDADES.find(p => p.value === v) || PRIORIDADES[1];
const getEstadoConf = (v) => ESTADOS_TAREA.find(e => e.value === v) || ESTADOS_TAREA[0];

// Formatea fecha ISO a "dd/mm/aaaa"
const formatFecha = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

// ── Modal de Tarea (Crear / Editar) ─────────────────────────────────────────
const ModalTarea = ({ tarea, proyectoId, usuarios, tareasProyecto = [], onClose, onGuardar }) => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'ADMIN';
  const [form, setForm] = useState({
    titulo:      tarea?.titulo      || '',
    descripcion: tarea?.descripcion || '',
    asignadoId:  tarea?.asignado?.id || '',
    prioridad:   tarea?.prioridad   || 'MEDIA',
    estado:      tarea?.estado      || 'PENDIENTE',
    venceEn:     tarea?.venceEn     ? tarea.venceEn.slice(0,10) : '',
    dependeDeId: tarea?.dependeDeId || '',
    primerComentario: '',
  });
  const [archivos, setArchivos] = useState([]);
  const [error, setError]       = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.titulo.trim()) { setError('El título es requerido'); return; }
    setCargando(true);
    try {
      if (tarea) {
        // Modo Edición: JSON normal
        const payload = {
          ...form,
          asignadoId:  form.asignadoId  || null,
          venceEn:     form.venceEn     || null,
          dependeDeId: form.dependeDeId || null,
        };
        await tareasService.editar(tarea.id, payload);
      } else {
        // Modo Creación: FormData para archivos y comentario
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (v) fd.append(k, v);
        });
        archivos.forEach(file => {
          fd.append('archivos', file);
        });
        await tareasService.crear(proyectoId, fd);
      }
      onGuardar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '2rem',
        width: '100%', maxWidth: tarea ? '650px' : '520px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        animation: 'fadeSlideIn 0.18s ease',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
            {tarea ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div className="alert-error">{error}</div>}

          {/* Título */}
          <div className="form-group">
            <label className="form-label" htmlFor="t-titulo">Título</label>
            <input id="t-titulo" name="titulo" type="text" required className="form-input"
              placeholder="Ej. Diseñar mockups de pantalla principal"
              value={form.titulo} onChange={handleChange} disabled={tarea && !esAdmin} />
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label className="form-label" htmlFor="t-desc">Descripción (opcional)</label>
            <textarea id="t-desc" name="descripcion" className="form-input" rows={2}
              placeholder="Detalla el alcance de esta tarea..."
              value={form.descripcion} onChange={handleChange}
              disabled={tarea && !esAdmin}
              style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* Asignado a */}
          <div className="form-group">
            <label className="form-label" htmlFor="t-asignado">Asignado a</label>
            <select id="t-asignado" name="asignadoId" className="form-input form-select"
              value={form.asignadoId} onChange={handleChange} disabled={tarea && !esAdmin}>
              <option value="">Sin asignar</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.area.charAt(0) + u.area.slice(1).toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Prioridad y Estado en fila */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="t-prio">Prioridad</label>
              <select id="t-prio" name="prioridad" className="form-input form-select"
                value={form.prioridad} onChange={handleChange} disabled={tarea && !esAdmin}>
                {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="t-estado">Estado</label>
              <select id="t-estado" name="estado" className="form-input form-select"
                value={form.estado} onChange={handleChange} disabled={tarea && !esAdmin}>
                {ESTADOS_TAREA.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          </div>

          {/* Fecha límite */}
          <div className="form-group">
            <label className="form-label" htmlFor="t-fecha">Fecha límite</label>
            <input id="t-fecha" name="venceEn" type="date" className="form-input"
              value={form.venceEn} onChange={handleChange}
              disabled={tarea && !esAdmin}
              style={{ colorScheme: 'dark' }} />
          </div>

          {/* Dependencia */}
          <div className="form-group">
            <label className="form-label" htmlFor="t-dep">Depende de (Bloqueada por)</label>
            <select id="t-dep" name="dependeDeId" className="form-input form-select"
              value={form.dependeDeId} onChange={handleChange} disabled={tarea && !esAdmin}>
              <option value="">-- Ninguna --</option>
              {tareasProyecto
                .filter(t => t.id !== tarea?.id) // No depender de sí misma
                .map(t => (
                  <option key={t.id} value={t.id}>{t.titulo}</option>
                ))}
            </select>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'block' }}>
              La tarea se marcará como bloqueada hasta que su predecesora se complete.
            </span>
          </div>

          {!tarea && (
            <>
              {/* Primer Comentario */}
              <div className="form-group" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <label className="form-label" htmlFor="t-com">Primer Comentario / Contexto</label>
                <textarea id="t-com" name="primerComentario" className="form-input" rows="2"
                  placeholder="Añade un comentario inicial para el equipo..."
                  value={form.primerComentario} onChange={handleChange} />
              </div>

              {/* Archivos Iniciales */}
              <div className="form-group">
                <label className="form-label">Archivos Adjuntos (Opcional)</label>
                <input type="file" multiple onChange={e => setArchivos([...e.target.files])} 
                  style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }} />
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Puedes seleccionar hasta 5 archivos.
                </div>
              </div>
            </>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '0.75rem',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              color: 'var(--color-text-muted)',
              cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem',
              transition: 'all 0.15s'
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {esAdmin ? 'Cancelar' : 'Cerrar'}
            </button>
            <button type="submit" className="btn-primary" disabled={cargando} style={{ flex: 1.5, padding: '0.75rem', fontSize: '0.95rem' }}>
              {cargando ? 'Guardando...' : tarea ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>

        {/* Sección de Adjuntos (Solo si la tarea ya existe) */}
        {tarea && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <TaskAttachments tareaId={tarea.id} />
          </div>
        )}

        {/* Sección de Comentarios (Solo si la tarea ya existe) */}
        {tarea && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <TaskComments tareaId={tarea.id} />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tarjeta de Tarea ────────────────────────────────────────────────────────
const TareaCard = ({ tarea, onClick, onEditar, onEliminar, onCambiarEstado }) => {
  const prioConf  = getPrioridad(tarea.prioridad);
  const estadoConf = getEstadoConf(tarea.estado);

  // Siguiente estado en el ciclo: PENDIENTE → EN_PROGRESO → HECHO → PENDIENTE
  const CICLO = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];
  const idxActual = CICLO.indexOf(tarea.estado);
  const siguienteEstado = CICLO[(idxActual + 1) % CICLO.length];
  const sigConf = getEstadoConf(siguienteEstado);

  const vencido = tarea.venceEn && new Date(tarea.venceEn) < new Date() && tarea.estado !== 'HECHO';

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: '0.75rem',
      padding: '1rem 1.1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      transition: 'box-shadow 0.2s, transform 0.1s',
      cursor: 'pointer',
    }}
      onClick={() => onClick(tarea)}
      onMouseOver={e => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={e  => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Primera fila: estado + prioridad */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
        <span style={{
          padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
          background: estadoConf.bg, color: estadoConf.color,
        }}>
          {estadoConf.label}
        </span>
        <span style={{ fontSize: '0.72rem', fontWeight: '600', color: prioConf.color }}>
          {prioConf.label}
        </span>
      </div>

      {/* Título */}
      <div style={{ fontWeight: '700', fontSize: '1.25rem', lineHeight: 1.4 }}>
        {tarea.titulo}
      </div>

      {/* Descripción */}
      {tarea.descripcion && (
        <div style={{
          fontSize: '1rem', color: 'var(--color-text-muted)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {tarea.descripcion}
        </div>
      )}

      {/* Metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        <span>👤 {tarea.asignado?.nombre || 'Sin asignar'}</span>
        {tarea.venceEn && (
          <span style={{ color: vencido ? '#f87171' : 'var(--color-text-muted)', fontWeight: vencido ? '600' : '400' }}>
            {vencido ? '⚠️' : '📅'} {formatFecha(tarea.venceEn)}
          </span>
        )}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
        {/* Cambiar estado rápido */}
        <button
          onClick={() => onCambiarEstado(tarea.id, siguienteEstado)}
          title={`Cambiar a: ${sigConf.label}`}
          style={{
            flex: 1, padding: '0.4rem 0.5rem',
            background: sigConf.bg,
            border: `1px solid ${sigConf.color}44`,
            borderRadius: '0.4rem',
            color: sigConf.color,
            fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer',
            transition: 'opacity 0.15s',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={e  => e.currentTarget.style.opacity = '1'}
        >
          → {sigConf.label}
        </button>

        {/* Editar — solo visible si el usuario tiene permiso (ADMIN) */}
        {onEditar && (
        <button onClick={() => onEditar(tarea)} style={{
          padding: '0.4rem 0.65rem',
          background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
          borderRadius: '0.4rem', color: 'var(--color-text)',
          fontSize: '0.72rem', cursor: 'pointer', transition: 'background 0.15s',
        }}
          onMouseOver={e => e.currentTarget.style.background = '#475569'}
          onMouseOut={e  => e.currentTarget.style.background = 'var(--color-surface-3)'}
        >✏️</button>
        )}

        {/* Eliminar — solo visible si el usuario tiene permiso (ADMIN) */}
        {onEliminar && (
          <button onClick={() => onEliminar(tarea)} style={{
            padding: '0.4rem 0.65rem',
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '0.4rem', color: 'var(--color-error)',
            fontSize: '0.72rem', cursor: 'pointer', transition: 'background 0.15s',
          }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(248,113,113,0.18)'}
            onMouseOut={e  => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
          >🗑️</button>
        )}
      </div>
    </div>
  );
};

// ── Toggle de vista ─────────────────────────────────────────────────────────
const VISTAS = [
  { key: 'lista',  label: 'Lista',  icon: '☰' },
  { key: 'kanban', label: 'Kanban', icon: '▦' },
  { key: 'gantt',  label: 'Gantt',  icon: '📅' },
  { key: 'muro',   label: 'Muro',   icon: '💬' },
  { key: 'actividad', label: 'Historial', icon: '📜' },
];

const ToggleVista = ({ vista, onChange }) => (
  <div style={{
    display: 'flex', gap: '0.25rem',
    background: 'var(--color-surface-3)',
    borderRadius: '0.6rem', padding: '0.25rem',
    border: '1px solid var(--color-border)',
  }}>
    {VISTAS.map(v => (
      <button
        key={v.key}
        onClick={() => onChange(v.key)}
        title={v.label}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '0.4rem', border: 'none',
          fontSize: '0.78rem', fontWeight: vista === v.key ? '700' : '400',
          cursor: 'pointer', transition: 'all 0.15s',
          background: vista === v.key ? 'var(--color-primary)' : 'transparent',
          color:      vista === v.key ? '#fff' : 'var(--color-text-muted)',
        }}
      >
        <span>{v.icon}</span> {v.label}
      </button>
    ))}
  </div>
);

// ── Página principal ────────────────────────────────────────────────────────
const ProyectoDetallePage = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { usuario }  = useAuth();
  const { showToast } = useToast();
  const esAdmin = usuario?.rol === 'ADMIN';

  const [proyecto, setProyecto]   = useState(null);
  const [tareas, setTareas]       = useState([]);
  const [usuarios, setUsuarios]         = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [error, setError]               = useState('');
  const [modalAbierto, setModal]        = useState(false);
  const [tareaEditando, setTareaEditando]   = useState(null);
  const [filtroCol, setFiltroCol]       = useState('TODOS');
  const [filtroArea, setFiltroArea]     = useState('TODAS');
  const [filtroPrio, setFiltroPrio]     = useState('TODAS');
  const [vista, setVista]               = useState('lista');
  const [filtradoPorUsuario, setFiltradoPorUsuario] = useState(false);

  // Cargar datos del proyecto + tareas + usuarios
  const cargar = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const [dataTareas, dataUsuarios] = await Promise.all([
        tareasService.listar(id),
        usuariosService.listar(),
      ]);
      setProyecto(dataTareas.proyecto);
      setTareas(dataTareas.tareas);
      setFiltradoPorUsuario(dataTareas.filtradoPorUsuario ?? false);
      setUsuarios(dataUsuarios.usuarios);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  // Estadísticas de tareas
  const pendientes  = tareas.filter(t => t.estado === 'PENDIENTE').length;
  const enProgreso  = tareas.filter(t => t.estado === 'EN_PROGRESO').length;
  const hechas      = tareas.filter(t => t.estado === 'HECHO').length;
  const total       = tareas.length;
  const porcentaje  = total > 0 ? Math.round((hechas / total) * 100) : 0;

  // Filtrado multi-criterio de tareas
  const tareasFiltradas = tareas.filter(t => {
    if (filtroCol  !== 'TODOS'  && t.estado          !== filtroCol)  return false;
    if (filtroArea !== 'TODAS'  && t.asignado?.area  !== filtroArea) return false;
    if (filtroPrio !== 'TODAS'  && t.prioridad        !== filtroPrio) return false;
    return true;
  });

  const handleCrear = () => { setTareaEditando(null); setModal(true); };
  const handleEditar  = (t) => { setTareaEditando(t);    setModal(true); };
  const handleGuardar = () => {
    setModal(false);
    showToast(tareaEditando ? 'Tarea actualizada' : 'Tarea creada', 'success');
    cargar();
  };

  const handleEliminar = async (tarea) => {
    if (!window.confirm(`¿Eliminar la tarea "${tarea.titulo}"?`)) return;
    try {
      await tareasService.eliminar(tarea.id);
      setTareas(prev => prev.filter(t => t.id !== tarea.id));
      showToast('Tarea eliminada', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleCambiarEstado = async (tareaId, nuevoEstado) => {
    try {
      const data = await tareasService.actualizarEstado(tareaId, nuevoEstado);
      setTareas(prev => prev.map(t => t.id === tareaId ? data.tarea : t));
    } catch (err) { showToast(err.message, 'error'); }
  };

  const areaConf = AREA_CONFIG[proyecto?.creador?.area] || {};
  const estadoProy = {
    ACTIVO:   { label: 'Activo',   color: '#34d399', bg: 'rgba(52,211,153,0.08)'  },
    EN_PAUSA: { label: 'En pausa', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)'  },
    CERRADO:  { label: 'Cerrado',  color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  }[proyecto?.estado] || {};

  if (cargando) return <Spinner texto="Cargando proyecto..." />;
  if (error) return (
    <div style={{ padding: '2rem' }}>
      <div className="alert-error">{error}</div>
      <button onClick={() => navigate('/proyectos')} style={{ marginTop: '1rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>← Volver</button>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: '1rem', fontSize: '0.825rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <Link to="/proyectos" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '500' }}>
              ← Proyectos
            </Link>
            <span style={{ margin: '0 0.5rem' }}>/</span>
            <span>{proyecto?.nombre}</span>
          </div>

          {/* Badge de área del usuario actual — solo para ADMIN o si se desea visibilidad extra */}
          {usuario && esAdmin && (() => {
            const AREA_CONF = {
              DESARROLLO:     { label: 'Desarrollo',     color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
              ADMINISTRACION: { label: 'Administración', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
              COMUNICACION:   { label: 'Comunicación',   color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
            };
            const conf = AREA_CONF[usuario.area] || { label: usuario.area, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: conf.bg, border: `1.5px solid ${conf.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '0.7rem', color: conf.color,
                }}>
                  {usuario.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: conf.color }}>{usuario.nombre.split(' ')[0]}</span>
                  <span style={{
                    marginLeft: '0.4rem', padding: '0.1rem 0.5rem', borderRadius: '999px',
                    background: conf.bg, color: conf.color,
                    fontSize: '0.65rem', fontWeight: '700',
                  }}>{conf.label}</span>
                  <span style={{
                    marginLeft: '0.3rem', padding: '0.1rem 0.5rem', borderRadius: '999px',
                    background: 'rgba(99,102,241,0.12)',
                    color: '#818cf8',
                    fontSize: '0.65rem', fontWeight: '700',
                  }}>Admin</span>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Banner: vista filtrada para miembros */}
        {filtradoPorUsuario && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.65rem',
            padding: '0.65rem 1rem', marginBottom: '1rem',
            background: 'rgba(129,140,248,0.06)',
            border: '1px solid rgba(129,140,248,0.15)',
            borderRadius: '0.65rem',
            fontSize: '0.8rem', color: 'var(--color-text-muted)',
          }}>
            <span style={{ fontSize: '1rem' }}>👤</span>
            <span>
              Estás viendo <strong>tus tareas asignadas</strong> en este proyecto.
              El administrador puede ver todas las tareas del equipo.
            </span>
          </div>
        )}

        {/* Info del proyecto */}
        <div style={{
          background: 'var(--color-surface-2)',
          border: `1px solid ${areaConf.color ? areaConf.color + '44' : 'var(--color-border)'}`,
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                {areaConf.label && (
                  <span style={{
                    padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
                    background: areaConf.bg, color: areaConf.color,
                  }}>{areaConf.label}</span>
                )}
                {estadoProy.label && (
                  <span style={{
                    padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
                    background: estadoProy.bg, color: estadoProy.color,
                  }}>{estadoProy.label}</span>
                )}
              </div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.25rem' }}>
                {proyecto?.nombre}
              </h1>
              {proyecto?.descripcion && (
                <p style={{ fontSize: '1.15rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {proyecto.descripcion}
                </p>
              )}
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Creado por {proyecto?.creador?.nombre}
              </p>
            </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Toggle de vista */}
              <ToggleVista vista={vista} onChange={setVista} />

              {/* Botón nueva tarea — Visible para todos los que ven el proyecto */}
              <button
                onClick={handleCrear}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.6rem 1.1rem',
                  background: 'var(--color-primary)', border: 'none',
                  borderRadius: '0.5rem', color: '#fff',
                  fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--color-primary-dark)'}
                onMouseOut={e  => e.currentTarget.style.background = 'var(--color-primary)'}
              >
                + Nueva tarea
              </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                Progreso
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: porcentaje === 100 ? '#34d399' : 'var(--color-text)' }}>
                {porcentaje}%
              </span>
            </div>
            <div style={{
              height: '8px', background: 'var(--color-surface-3)', borderRadius: '999px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${porcentaje}%`,
                background: porcentaje === 100 ? '#34d399' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }} />
            </div>

            {/* Contadores */}
            <div style={{
              display: 'flex', gap: '1.25rem', marginTop: '0.75rem',
              fontSize: '0.8rem', flexWrap: 'wrap',
            }}>
              {[
                { label: 'Por hacer',   count: pendientes, color: '#94a3b8' },
                { label: 'En progreso', count: enProgreso, color: '#818cf8' },
                { label: 'Hecho',       count: hechas,     color: '#34d399' },
              ].map(({ label, count, color }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ fontWeight: '700', color }}>{count}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
      </div>

      {/* ── Filtros de tareas — Prioridad (Visibles para todos) ── */}
      {total > 0 && vista === 'lista' && (
        <div style={{
          display: 'flex', gap: '0.65rem', marginBottom: '1.25rem',
          flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Prioridad:</span>

          {['TODAS','ALTA','MEDIA','BAJA'].map(p => (
            <button key={p} onClick={() => setFiltroPrio(p)} style={{
              padding: '0.35rem 1rem', borderRadius: '0.6rem', border: '1px solid',
              fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
              borderColor: filtroPrio === p ? 'var(--color-primary)' : 'var(--color-border)',
              background:   filtroPrio === p ? 'rgba(99,102,241,0.1)' : 'transparent',
              color:        filtroPrio === p ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}>
              {p === 'TODAS' ? 'Todas' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}

          {/* Badge: tareas visibles */}
          {(filtroPrio !== 'TODAS') && (
            <>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                {tareasFiltradas.length} tareas encontradas
              </span>
              <button onClick={() => { setFiltroPrio('TODAS'); }}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600' }}>
                Limpiar ✕
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Área de contenido según vista ── */}
      {total === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3.5rem 2rem',
            background: 'var(--color-surface-2)',
            border: '1px dashed var(--color-border)',
            borderRadius: '1rem',
            color: 'var(--color-text-muted)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <div style={{ fontWeight: '600', marginBottom: '0.35rem' }}>No hay tareas aún</div>
            <div style={{ fontSize: '0.85rem' }}>Crea la primera tarea con el botón de arriba.</div>
          </div>
        ) : vista === 'kanban' ? (
          /* ── Vista Kanban por día/urgencia ── */
          <KanbanView
            tareas={tareasFiltradas}
            onTareasChange={setTareas}
            onClick={handleEditar}
            onEditar={esAdmin ? handleEditar : null}
            onEliminar={esAdmin ? handleEliminar : null}
            onCambiarEstado={handleCambiarEstado}
          />
        ) : vista === 'gantt' ? (
          /* ── Vista Gantt ── */
          <GanttView proyecto={proyecto} tareas={tareasFiltradas} />
        ) : vista === 'actividad' ? (
          /* ── Vista Historial de Actividad ── */
          <ProjectActivityLog proyectoId={id} />
        ) : vista === 'muro' ? (
          /* ── Vista Muro (Comentarios y Adjuntos del Proyecto) ── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', animation: 'fadeSlideIn 0.3s ease' }}>
            <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--color-border)' }}>
              <TaskComments tareaId={id} type="proyectos" />
            </div>
            <div style={{ background: 'var(--color-surface-2)', padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--color-border)' }}>
              <TaskAttachments tareaId={id} type="proyectos" />
            </div>
          </div>
        ) : (
          /* ── Vista Lista (default) ── */
          <>
            {tareasFiltradas.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '2.5rem',
                background: 'var(--color-surface-2)',
                border: '1px dashed var(--color-border)',
                borderRadius: '1rem', color: 'var(--color-text-muted)',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
                No hay tareas con los filtros seleccionados.{' '}
                <button onClick={() => { setFiltroArea('TODAS'); setFiltroPrio('TODAS'); setFiltroCol('TODOS'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '500' }}>
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.25rem',
              }}>
                {tareasFiltradas.map(tarea => (
                  <TareaCard
                    key={tarea.id}
                    tarea={tarea}
                    onClick={handleEditar}
                    onEditar={esAdmin ? handleEditar : null}
                    onEliminar={esAdmin ? handleEliminar : null}
                    onCambiarEstado={handleCambiarEstado}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>{/* ── fin div principal padding ── */}

      {/* Modal */}
      {modalAbierto && (
        <ModalTarea
          tarea={tareaEditando}
          proyectoId={id}
          usuarios={usuarios}
          tareasProyecto={tareas}
          onClose={() => setModal(false)}
          onGuardar={handleGuardar}
        />
      )}
    </>
  );
};

export default ProyectoDetallePage;
