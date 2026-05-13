import { useState, useCallback, useMemo } from 'react';
import { 
  User, 
  Flag, 
  Circle, 
  BarChart3, 
  CalendarRange,
  Clock
} from 'lucide-react';

// ── Configuración de colores (Material Palette) ──────────────────────────────
const AREA_COLORS = {
  DESARROLLO:     { bar: '#00a2ff', text: '#fff' },
  ADMINISTRACION: { bar: '#ff9100', text: '#fff' },
  COMUNICACION:   { bar: '#d500f9', text: '#fff' },
  DEFAULT:        { bar: '#6c757d', text: '#fff' },
};

const ESTADO_LABELS = {
  PENDIENTE:   'Por hacer',
  EN_PROGRESO: 'En progreso',
  HECHO:       'Hecho',
};

// ── Utilidades ──────────────────────────────────────────────────────────────
const formatFecha = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
const formatMes   = (d) => new Date(d).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

// ── Tooltip Component ───────────────────────────────────────────────────────
const Tooltip = ({ tarea, rect }) => {
  if (!tarea || !rect) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: rect.top - 110,
      left: rect.left + rect.width / 2 - 100,
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
      width: '220px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      fontSize: '0.8rem',
      color: '#f1f5f9',
    }}>
      <div style={{ fontWeight: '800', marginBottom: '0.4rem', color: '#fff' }}>{tarea.titulo}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', opacity: 0.85 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={12} /> {tarea.asignado?.nombre || 'Sin asignar'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flag size={12} /> Límite: {tarea.venceEn ? new Date(tarea.venceEn).toLocaleDateString() : '—'}
        </div>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: tarea.estado === 'HECHO' ? '#34d399' : '#fbbf24',
          fontWeight: '700'
        }}>
          <Circle size={8} fill="currentColor" /> {ESTADO_LABELS[tarea.estado]}
        </div>
      </div>
    </div>
  );
};

// ── Main Gantt Component ─────────────────────────────────────────────────────
const GanttView = ({ proyecto, tareas }) => {
  const [hoveredTask, setHoveredTask] = useState(null);

  // 1. Calcular rango de fechas (Inicio - Fin)
  const range = useMemo(() => {
    let start = new Date(proyecto.creadoEn);
    let end   = new Date(start);
    end.setDate(end.getDate() + 30); // Mínimo 30 días

    tareas.forEach(t => {
      const tStart = new Date(t.fechaInicio || t.creadoEn);
      if (tStart < start) start = tStart;
      if (t.venceEn) {
        const tEnd = new Date(t.venceEn);
        if (tEnd > end) end = tEnd;
      }
    });

    // Padding lateral
    start = new Date(start); start.setDate(start.getDate() - 2);
    end   = new Date(end);   end.setDate(end.getDate() + 5);

    return { start, end };
  }, [proyecto, tareas]);

  const totalDays = Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24));
  
  // 2. Generar Marcadores (Días y Meses)
  const days = useMemo(() => {
    const arr = [];
    const curr = new Date(range.start);
    while (curr <= range.end) {
      arr.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return arr;
  }, [range]);

  const months = useMemo(() => {
    const arr = [];
    days.forEach(d => {
      const label = formatMes(d);
      if (arr.length === 0 || arr[arr.length - 1].label !== label) {
        arr.push({ label, startIndex: days.indexOf(d), count: 0 });
      }
      arr[arr.length - 1].count++;
    });
    return arr;
  }, [days]);

  // 3. Posicionamiento de barras
  const getPosition = (date) => {
    const d = new Date(date);
    const diff = (d - range.start) / (1000 * 60 * 60 * 24);
    return (diff / totalDays) * 100;
  };

  const getTaskColor = (tarea) => {
    const area = tarea.asignado?.area || 'DEFAULT';
    return AREA_COLORS[area] || AREA_COLORS.DEFAULT;
  };

  const DAY_WIDTH = 40; // Ancho mínimo por día en px
  const NAME_WIDTH = 220; // Ancho columna de nombres

  if (tareas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--color-surface-2)', borderRadius: '1rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ color: 'var(--color-text-dim)' }}><CalendarRange size={48} /></div>
        <p>No hay tareas programadas para visualizar el diagrama.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {hoveredTask && <Tooltip tarea={hoveredTask.tarea} rect={hoveredTask.rect} />}

      <div style={{
        background: 'var(--color-surface-2)',
        borderRadius: '1.25rem',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        {/* Leyenda Superior */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-primary)' }}>DIAGRAMA DE GANTT</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {Object.entries(AREA_COLORS).map(([key, val]) => (
              key !== 'DEFAULT' && (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: val.bar }} />
                  <span style={{ opacity: 0.7 }}>{key}</span>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Scrollable Area */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <div style={{ 
            minWidth: `${NAME_WIDTH + (totalDays * DAY_WIDTH)}px`,
            position: 'relative'
          }}>
            
            {/* ── HEADER ────────────────────────────────────────────────── */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
              <div className="w-[180px] lg:w-[220px] shrink-0 p-4 border-r border-slate-200 font-black text-[10px] text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-30">
                Tareas
              </div>
              <div className="flex-1">
                {/* Meses */}
                <div className="flex border-b border-slate-100">
                  {months.map((m, i) => (
                    <div key={i} className="p-2 text-[10px] font-black uppercase tracking-widest text-blue-600 text-center border-r border-slate-100" style={{ width: `${(m.count / totalDays) * 100}%` }}>
                      {m.label}
                    </div>
                  ))}
                </div>
                {/* Días */}
                <div className="flex">
                  {days.map((d, i) => (
                    <div key={i} className={`flex-1 text-center py-2 text-[9px] font-bold border-r border-slate-50 ${d.getDay() === 0 || d.getDay() === 6 ? 'text-red-400 bg-red-50/30' : 'text-slate-400'}`}>
                      {d.getDate()}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── FILAS ─────────────────────────────────────────────────── */}
            <div style={{ position: 'relative' }}>
              {/* Líneas de cuadrícula de fondo */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                <div style={{ width: NAME_WIDTH }} />
                {days.map((d, i) => (
                  <div key={i} style={{ 
                    flex: 1, borderRight: '1px solid var(--color-border-light)',
                    background: d.getDay() === 0 || d.getDay() === 6 ? 'rgba(255,255,255,0.01)' : 'transparent'
                  }} />
                ))}
              </div>

              {/* Contenido Real */}
              {tareas.map((tarea, idx) => {
                const color = getTaskColor(tarea);
                const startPct = getPosition(tarea.fechaInicio || tarea.creadoEn);
                const endPct   = tarea.venceEn ? getPosition(tarea.venceEn) : (startPct + 5);
                const widthPct = Math.max(2, endPct - startPct);
                
                return (
                  <div key={tarea.id} className={`flex border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/20'}`}>
                    {/* Nombre Tarea (Sticky) */}
                    <div className="w-[180px] lg:w-[220px] shrink-0 p-4 border-r border-slate-100 text-xs font-bold text-slate-700 truncate sticky left-0 bg-white lg:bg-transparent z-10">
                      <span className={tarea.estado === 'HECHO' ? 'line-through opacity-40' : ''}>
                        {tarea.titulo}
                      </span>
                    </div>

                    {/* Timeline Cell */}
                    <div className="flex-1 relative h-14">
                      <div 
                        onMouseEnter={(e) => setHoveredTask({ tarea, rect: e.currentTarget.getBoundingClientRect() })}
                        onMouseLeave={() => setHoveredTask(null)}
                        className="absolute top-1/2 -translate-y-1/2 h-7 rounded-full shadow-lg cursor-pointer z-0 border-2 border-white/20 transition-transform hover:scale-[1.02]"
                        style={{
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          background: color.bar,
                          boxShadow: `0 4px 12px ${color.bar}44`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Marcador de "Hoy" */}
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: `${NAME_WIDTH + (getPosition(new Date()) * (1 - NAME_WIDTH/totalDays))}%`, // Ajuste manual simple o similar
              // En realidad es más fácil si el marcador es relativo al flex-1 del header
              width: '2px',
              background: 'var(--color-error)',
              zIndex: 5,
              pointerEvents: 'none'
            }}>
              <div style={{
                position: 'absolute', top: 0, left: '-4px', 
                width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-error)'
              }} />
            </div>

          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        Mostrando {tareas.length} tareas en un rango de {totalDays} días.
      </div>
    </div>
  );
};

export default GanttView;
