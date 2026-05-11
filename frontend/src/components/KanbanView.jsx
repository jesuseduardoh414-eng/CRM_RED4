// Vista Kanban — columnas por URGENCIA/DÍA
// Agrupa las tareas por su proximidad a la fecha límite:
//   ⚠️ Vencidas | 🔴 Hoy | 🟡 Esta semana | 🔵 Más adelante | 📋 Sin fecha

import { useState, useRef } from 'react';

// ── Columnas por ESTADO (Pipeline) ───────────────────────────────────────────
const COLUMNAS = [
  {
    key:    'PENDIENTE',
    label:  'Por hacer',
    icon:   '📋',
    color:  '#94a3b8',
    bg:     'rgba(148,163,184,0.07)',
    borde:  'rgba(148,163,184,0.2)',
    hover:  'rgba(148,163,184,0.13)',
    desc:   'Tareas por iniciar',
  },
  {
    key:    'EN_PROGRESO',
    label:  'En progreso',
    icon:   '⚡',
    color:  '#818cf8',
    bg:     'rgba(129,140,248,0.07)',
    borde:  'rgba(129,140,248,0.25)',
    hover:  'rgba(129,140,248,0.14)',
    desc:   'Trabajando en esto',
  },
  {
    key:    'HECHO',
    label:  'Completado',
    icon:   '✅',
    color:  '#34d399',
    bg:     'rgba(52,211,153,0.07)',
    borde:  'rgba(52,211,153,0.25)',
    hover:  'rgba(52,211,153,0.14)',
    desc:   'Tareas finalizadas',
  },
];

const ESTADO_CONFIG = {
  PENDIENTE:   { label: 'Por hacer',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
  EN_PROGRESO: { label: 'En progreso', color: '#818cf8', bg: 'rgba(129,140,248,0.08)' },
  HECHO:       { label: 'Hecho',       color: '#34d399', bg: 'rgba(52,211,153,0.08)'  },
};

const PRIORIDAD_CONFIG = {
  ALTA:  { color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  MEDIA: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)'  },
  BAJA:  { color: '#4ade80', bg: 'rgba(74,222,128,0.08)'  },
};

const AREA_COLORS = {
  DESARROLLO:     '#818cf8',
  ADMINISTRACION: '#fbbf24',
  COMUNICACION:   '#34d399',
};

const CICLO_ESTADOS = ['PENDIENTE', 'EN_PROGRESO', 'HECHO'];

const estaVencida = (fechaStr) => {
  if (!fechaStr) return false;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f   = new Date(fechaStr); f.setHours(0,0,0,0);
  return f < hoy;
};

const esHoy = (fechaStr) => {
  if (!fechaStr) return false;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const f   = new Date(fechaStr); f.setHours(0,0,0,0);
  return f.getTime() === hoy.getTime();
};

const fmtFecha = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
};

// ── Tarjeta Kanban ───────────────────────────────────────────────────────────
const KanbanCard = ({ tarea, actualizando, onClick, onEditar, onEliminar, onCambiarEstado, onDragStart }) => {
  const prioConf   = PRIORIDAD_CONFIG[tarea.prioridad]  || PRIORIDAD_CONFIG.MEDIA;
  const estadoConf = ESTADO_CONFIG[tarea.estado]        || ESTADO_CONFIG.PENDIENTE;
  const areaColor  = AREA_COLORS[tarea.asignado?.area]  || '#94a3b8';

  // Siguiente estado en ciclo
  const idxActual = CICLO_ESTADOS.indexOf(tarea.estado);
  const sigEstado = CICLO_ESTADOS[(idxActual + 1) % CICLO_ESTADOS.length];
  const sigConf   = ESTADO_CONFIG[sigEstado];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, tarea.id)}
      style={{
        background:   'var(--color-surface)',
        border:       `1px solid var(--color-border)`,
        borderRadius: '0.7rem',
        padding:      '0.8rem 0.9rem',
        cursor:        actualizando ? 'wait' : 'grab',
        opacity:       actualizando ? 0.45 : tarea.estado === 'HECHO' ? 0.65 : 1,
        transition:   'opacity 0.2s, box-shadow 0.15s, transform 0.12s',
        userSelect:   'none',
        display:      'flex', flexDirection: 'column', gap: '0.5rem',
      }}
      onMouseOver={e => {
        if (!actualizando) {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseOut={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
      onClick={() => onClick(tarea)}
    >
      {/* Fila superior: estado actual */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{
          padding: '0.2rem 0.65rem', borderRadius: '999px',
          fontSize: '0.8rem', fontWeight: '800',
          background: estadoConf.bg, color: estadoConf.color,
        }}>
          {estadoConf.label}
        </span>
        <span style={{
          padding: '0.2rem 0.65rem', borderRadius: '999px',
          fontSize: '0.8rem', fontWeight: '800',
          background: prioConf.bg, color: prioConf.color,
        }}>
          {tarea.prioridad}
        </span>
        {estaVencida(tarea.venceEn) && tarea.estado !== 'HECHO' && (
          <span style={{
            padding: '0.2rem 0.65rem', borderRadius: '999px',
            fontSize: '0.75rem', fontWeight: '800',
            background: 'rgba(248,113,113,0.15)', color: '#f87171',
            border: '1px solid rgba(248,113,113,0.3)',
          }}>
            ⚠️ Acumulada
          </span>
        )}
      </div>

      {/* Título */}
      <div style={{
        fontSize: '1.15rem', fontWeight: '800', lineHeight: 1.35,
        textDecoration: tarea.estado === 'HECHO' ? 'line-through' : 'none',
        color: estaVencida(tarea.venceEn) && tarea.estado !== 'HECHO' ? '#f87171' : 'inherit',
      }}>
        {tarea.titulo}
      </div>

      {/* Descripción truncada */}
      {tarea.descripcion && (
        <div style={{
          fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {tarea.descripcion}
        </div>
      )}

      {/* Footer: asignado + fecha */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: '0.4rem', borderTop: '1px solid var(--color-border)',
        fontSize: '0.7rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', gap: '0.25rem',
      }}>
        {tarea.asignado ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: areaColor + '22', border: `1px solid ${areaColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: '800', color: areaColor, flexShrink: 0,
            }}>
              {tarea.asignado.nombre.charAt(0).toUpperCase()}
            </div>
            <span style={{ color: areaColor, fontWeight: '600', fontSize: '0.85rem' }}>
              {tarea.asignado.nombre.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span style={{ color: '#475569', fontSize: '0.85rem' }}>Sin asignar</span>
        )}
        {tarea.venceEn && (
          <span style={{ fontSize: '0.85rem' }}>{fmtFecha(tarea.venceEn)}</span>
        )}
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.1rem' }}>
        {/* Avanzar estado */}
        {tarea.estado !== 'HECHO' && (
          <button
            onClick={(e) => { e.stopPropagation(); onCambiarEstado(tarea.id, sigEstado); }}
            style={{
              flex: 1, padding: '0.3rem 0.4rem',
              background: sigConf.bg, border: `1px solid ${sigConf.color}44`,
              borderRadius: '0.35rem', color: sigConf.color,
              fontSize: '0.65rem', fontWeight: '600', cursor: 'pointer',
            }}
          >→ {sigConf.label}</button>
        )}
        {/* Editar — solo ADMIN */}
        {onEditar && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditar(tarea); }}
          style={{
            padding: '0.3rem 0.5rem', background: 'var(--color-surface-3)',
            border: '1px solid var(--color-border)', borderRadius: '0.35rem',
            color: 'var(--color-text-muted)', fontSize: '0.7rem', cursor: 'pointer',
          }}
        >✏️</button>
        )}
        {/* Eliminar (solo si tiene permiso) */}
        {onEliminar && (
          <button
            onClick={(e) => { e.stopPropagation(); onEliminar(tarea); }}
            style={{
              padding: '0.3rem 0.5rem',
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '0.35rem', color: 'var(--color-error)',
              fontSize: '0.7rem', cursor: 'pointer',
            }}
          >🗑️</button>
        )}
      </div>
    </div>
  );
};

// ── Columna de urgencia ──────────────────────────────────────────────────────
const KanbanColumna = ({ col, tareas, actualizando, onClick, onEditar, onEliminar, onCambiarEstado, onDragStart, onDrop }) => {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '240px', flex: '1 1 0', maxWidth: '340px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.7rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{col.icon}</span>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: col.color }}>{col.label}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{col.desc}</div>
        </div>
        <span style={{
          marginLeft: 'auto', minWidth: '24px', height: '24px',
          padding: '0 0.4rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '999px', background: col.bg, color: col.color,
          fontSize: '0.85rem', fontWeight: '800', border: `1px solid ${col.borde}`,
        }}>
          {tareas.length}
        </span>
      </div>

      {/* Zona de drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(e, col.key); }}
        style={{
          flex: 1, minHeight: '100px',
          borderRadius: '0.75rem',
          border: `2px dashed ${dragOver ? col.color : 'transparent'}`,
          background: dragOver ? col.hover : col.bg,
          padding: '0.65rem',
          display: 'flex', flexDirection: 'column', gap: '0.55rem',
          transition: 'background 0.12s, border-color 0.12s',
        }}
      >
        {tareas.map(tarea => (
          <KanbanCard
            key={tarea.id}
            tarea={tarea}
            actualizando={actualizando === tarea.id}
            onClick={onClick}
            onEditar={onEditar}
            onEliminar={onEliminar}
            onCambiarEstado={onCambiarEstado}
            onDragStart={onDragStart}
          />
        ))}

        {tareas.length === 0 && !dragOver && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: col.color + '44', fontSize: '0.75rem', padding: '1rem 0', textAlign: 'center',
          }}>
            Sin tareas aquí
          </div>
        )}

        {dragOver && (
          <div style={{
            border: `2px dashed ${col.color}`, borderRadius: '0.5rem',
            height: '50px', background: col.color + '10', flexShrink: 0,
          }} />
        )}
      </div>
    </div>
  );
};

// ── Board Kanban principal ───────────────────────────────────────────────────
const KanbanView = ({ tareas, onClick, onEditar, onEliminar, onCambiarEstado }) => {
  const [actualizando, setActualizando] = useState(null);
  const tareaArrastradaId = useRef(null);

  // Kanban EXCLUSIVO para el día a día (Hoy + Pendientes Acumuladas de días anteriores)
  const tareasFiltradas = tareas.filter(t => {
    return esHoy(t.venceEn) || (t.venceEn && estaVencida(t.venceEn) && t.estado !== 'HECHO');
  });

  const tareasPorCol = (key) => tareasFiltradas.filter(t => t.estado === key);

  const handleDragStart = (e, tareaId) => {
    tareaArrastradaId.current = tareaId;
    e.dataTransfer.setData('text/plain', String(tareaId));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Al soltar en una columna de ESTADO
  const handleDrop = async (e, colKey) => {
    e.preventDefault();
    const id = tareaArrastradaId.current;
    if (!id) return;

    // Buscar la tarea para ver si el estado cambió
    const tarea = tareas.find(t => t.id === Number(id));
    if (tarea && tarea.estado !== colKey) {
      await handleCambiarEstado(Number(id), colKey);
    }
    
    tareaArrastradaId.current = null;
  };

  // Cambiar estado inline desde el botón de la tarjeta
  const handleCambiarEstado = async (tareaId, nuevoEstado) => {
    if (!onCambiarEstado) return;
    setActualizando(tareaId);
    try {
      // Esperamos a que el padre complete la operación
      await onCambiarEstado(tareaId, nuevoEstado);
    } finally {
      setActualizando(null);
    }
  };


  return (
    <div>
      {/* Encabezado Operativo */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--color-text)', marginBottom: '0.2rem' }}>
            Plan del Día
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', fontWeight: '500' }}>
            Tareas para hoy y pendientes acumuladas
          </p>
        </div>
        
        <div style={{ 
          padding: '0.6rem 1.25rem', borderRadius: '0.75rem', 
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          color: 'var(--color-primary)', fontSize: '1.05rem', fontWeight: '800' 
        }}>
          📅 {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}
        </div>
      </div>

      {/* Board */}
      <div style={{
        display: 'flex', gap: '0.85rem',
        overflowX: 'auto', paddingBottom: '1rem',
        alignItems: 'flex-start',
      }}>
        {COLUMNAS.map(col => (
          <KanbanColumna
            key={col.key}
            col={col}
            tareas={tareasPorCol(col.key)}
            actualizando={actualizando}
            onClick={onClick}
            onEditar={onEditar}
            onEliminar={onEliminar}
            onCambiarEstado={handleCambiarEstado}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanView;
