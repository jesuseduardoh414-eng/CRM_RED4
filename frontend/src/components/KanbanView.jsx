import { useState, useRef } from 'react';
import { 
  Plus, 
  ListTodo, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Pencil,
  Calendar
} from 'lucide-react';

// ── Configuración Visual ───────────────────────────────────────────────────
const COLUMNAS = [
  {
    key:    'PENDIENTE',
    label:  'Por hacer',
    icon:   <ListTodo size={18} />,
    color:  'var(--color-text-muted)',
    bg:     'var(--color-surface-2)',
    borde:  'var(--color-border)',
    hover:  'var(--color-surface-3)',
  },
  {
    key:    'EN_PROGRESO',
    label:  'En progreso',
    icon:   <Zap size={18} />,
    color:  'var(--color-accent-blue)',
    bg:     'rgba(0,162,255,0.05)',
    borde:  'rgba(0,162,255,0.15)',
    hover:  'rgba(0,162,255,0.1)',
  },
  {
    key:    'HECHO',
    label:  'Completado',
    icon:   <CheckCircle2 size={18} />,
    color:  'var(--color-accent-green)',
    bg:     'rgba(0,209,102,0.05)',
    borde:  'rgba(0,209,102,0.15)',
    hover:  'rgba(0,209,102,0.1)',
  },
];

const PRIORIDAD_CONFIG = {
  ALTA:  { color: 'var(--color-accent-pink)',  bg: 'rgba(255,0,85,0.1)', label: 'Crítica' },
  MEDIA: { color: 'var(--color-accent-amber)', bg: 'rgba(255,145,0,0.1)', label: 'Media' },
  BAJA:  { color: 'var(--color-accent-blue)',  bg: 'rgba(0,162,255,0.1)', label: 'Normal' },
};

const CICLO_ESTADOS = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];

// ── Utilidades ──────────────────────────────────────────────────────────────
const formatFecha = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const esVencida = (fechaStr) => {
  if (!fechaStr) return false;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f   = new Date(fechaStr); f.setHours(0,0,0,0);
  return f < hoy;
};

// ── Tarjeta Kanban (Material Style) ──────────────────────────────────────────
const KanbanCard = ({ tarea, actualizando, onClick, onEditar, onCambiarEstado, onActualizarTarea, onDragStart }) => {
  const prio = PRIORIDAD_CONFIG[tarea.prioridad] || PRIORIDAD_CONFIG.MEDIA;
  const idxActual = CICLO_ESTADOS.indexOf(tarea.estado);
  const sigEstado = CICLO_ESTADOS[(idxActual + 1) % CICLO_ESTADOS.length];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, tarea.id)}
      onClick={() => onClick(tarea)}
      style={{
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        borderRadius: '1rem',
        padding: '1rem',
        cursor: actualizando ? 'wait' : 'grab',
        opacity: actualizando ? 0.6 : 1,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative'
      }}
      onMouseOver={e => {
        if (!actualizando) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      {/* Badge de Prioridad */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ 
          fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', 
          letterSpacing: '0.05em', padding: '0.2rem 0.6rem', borderRadius: '4px',
          background: prio.bg, color: prio.color
        }}>
          {prio.label}
        </span>
        {esVencida(tarea.venceEn) && tarea.estado !== 'HECHO' && (
          <span style={{ color: 'var(--color-error)', fontSize: '0.65rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <AlertCircle size={10} /> Vencida
          </span>
        )}
      </div>

      {/* Título y Desc */}
      <div>
        <h4 style={{ 
          fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.25rem',
          textDecoration: tarea.estado === 'HECHO' ? 'line-through' : 'none',
          opacity: tarea.estado === 'HECHO' ? 0.5 : 1
        }}>
          {tarea.titulo}
        </h4>
        {tarea.descripcion && (
          <p style={{ 
            fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {tarea.descripcion}
          </p>
        )}
      </div>

      {/* Info Asignado y Fecha */}
      <div style={{ 
        marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ 
            width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-primary-light)'
          }}>
            {tarea.asignado?.nombre?.charAt(0) || '?'}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--color-text-muted)' }}>
            {tarea.asignado?.nombre?.split(' ')[0] || 'S/A'}
          </span>
        </div>
        {tarea.venceEn && (
          <span style={{ fontSize: '0.72rem', color: esVencida(tarea.venceEn) ? 'var(--color-error)' : 'var(--color-text-dim)' }}>
            {formatFecha(tarea.venceEn)}
          </span>
        )}
      </div>

      {/* Acciones Rápidas */}
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
        {tarea.estado !== 'HECHO' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onCambiarEstado(tarea.id, sigEstado); }}
            style={{ 
              flex: 1, padding: '0.4rem', borderRadius: '0.5rem', background: 'var(--color-surface-3)',
              border: 'none', color: 'var(--color-text)', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
            }}
          >
            Avanzar <ArrowRight size={12} />
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onEditar(tarea); }}
          style={{ padding: '0.4rem 0.6rem', borderRadius: '0.5rem', background: 'var(--color-surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Pencil size={12} />
        </button>
      </div>
    </div>
  );
};

// ── Columna Kanban ───────────────────────────────────────────────────────────
const KanbanColumna = ({ col, tareas, actualizando, onClick, onEditar, onEliminar, onCambiarEstado, onActualizarTarea, onDragStart, onDrop, limite, onCargarMas }) => {
  const [dragOver, setDragOver] = useState(false);
  const tareasVisibles = tareas.slice(0, (tareas.length > 20 && limite === 10) ? 10 : limite);

  return (
    <div className="flex-1 min-w-[300px] w-[85vw] md:w-auto md:max-w-[400px] flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{col.icon}</span>
          <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: col.color }}>{col.label}</h3>
        </div>
        <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-500">
          {tareas.length}
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(e, col.key); }}
        className={`
          flex-1 rounded-2xl p-2 flex flex-col gap-4 transition-all duration-200 min-h-[500px] max-h-[70vh] overflow-y-auto
          ${dragOver ? 'bg-slate-50 border-2 border-dashed' : 'bg-transparent border-2 border-transparent'}
        `}
        style={{ 
          borderColor: dragOver ? col.color : 'transparent',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.1) transparent'
        }}
      >
        {tareasVisibles.map(t => (
          <KanbanCard 
            key={t.id} 
            tarea={t} 
            actualizando={actualizando === t.id}
            onClick={onClick}
            onEditar={onEditar}
            onEliminar={onEliminar}
            onCambiarEstado={onCambiarEstado}
            onActualizarTarea={onActualizarTarea}
            onDragStart={onDragStart}
          />
        ))}

        {tareas.length > tareasVisibles.length && (
          <button 
            onClick={onCargarMas}
            className="w-full py-3 bg-white/50 border border-slate-200 border-dashed rounded-xl text-[10px] font-black text-slate-500 hover:bg-white hover:border-slate-300 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
          >
            Ver más ({tareas.length - tareasVisibles.length}) <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

// ── View Principal ───────────────────────────────────────────────────────────
const KanbanView = ({ tareas, onClick, onEditar, onEliminar, onCambiarEstado, onActualizarTarea }) => {
  const [actualizando, setActualizando] = useState(null);
  const [soloHoy, setSoloHoy] = useState(true);
  const [limites, setLimites] = useState({ PENDIENTE: 10, EN_PROGRESO: 10, HECHO: 10 });
  const dragId = useRef(null);

  const handleDragStart = (e, id) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, colKey) => {
    const id = dragId.current;
    if (!id) return;
    const t = tareas.find(x => x.id === Number(id));
    if (t && t.estado !== colKey) {
      setActualizando(id);
      try {
        await onCambiarEstado(Number(id), colKey);
      } finally {
        setActualizando(null);
      }
    }
    dragId.current = null;
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const tareasFiltradas = soloHoy 
    ? tareas.filter(t => (t.fechaInicio && t.fechaInicio.slice(0, 10) === hoy) || (t.venceEn && t.venceEn.slice(0, 10) === hoy))
    : tareas;

  return (
    <div className="flex flex-col gap-6">
      {/* Filtro de día */}
      <div className="flex flex-wrap gap-2 lg:gap-4 items-center">
        <button 
          onClick={() => setSoloHoy(false)}
          className={`
            px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
            ${!soloHoy ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}
          `}
        >
          Todas las tareas
        </button>
        <button 
          onClick={() => setSoloHoy(true)}
          className={`
            px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2
            ${soloHoy ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}
          `}
        >
          Solo hoy <Calendar size={14} />
        </button>
      </div>

      <div className="flex gap-4 lg:gap-8 overflow-x-auto pb-8 snap-x snap-mandatory lg:snap-none">
        {COLUMNAS.map(col => (
          <div key={col.key} className="snap-center">
            <KanbanColumna 
              col={col}
              tareas={tareasFiltradas.filter(t => t.estado === col.key)}
              actualizando={actualizando}
              onClick={onClick}
              onEditar={onEditar}
              onEliminar={onEliminar}
              onCambiarEstado={onCambiarEstado}
              onActualizarTarea={onActualizarTarea}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              limite={limites[col.key]}
              onCargarMas={() => setLimites(prev => ({ ...prev, [col.key]: prev[col.key] + 10 }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanView;
