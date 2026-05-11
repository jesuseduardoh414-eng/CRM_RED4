// Vista Gantt — timeline horizontal con divs CSS
// Barras posicionadas con position: absolute + width en %

import { useState, useCallback } from 'react';

const AREA_COLORS = {
  DESARROLLO:     { bar: '#818cf8', light: 'rgba(129,140,248,0.15)' },
  ADMINISTRACION: { bar: '#fbbf24', light: 'rgba(251,191,36,0.15)'  },
  COMUNICACION:   { bar: '#34d399', light: 'rgba(52,211,153,0.15)'  },
  DEFAULT:        { bar: '#94a3b8', light: 'rgba(148,163,184,0.15)' },
};

const ESTADO_LABELS = {
  PENDIENTE:   'Por hacer',
  EN_PROGRESO: 'En progreso',
  HECHO:       'Hecho',
};

const fmtCorta = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
const fmtLarga = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// ── Tooltip ──────────────────────────────────────────────────────────────────
const Tooltip = ({ tarea, rect }) => {
  if (!tarea || !rect) return null;
  const screenW = window.innerWidth;
  const left = rect.left + rect.width / 2 > screenW / 2
    ? rect.left - 220
    : rect.right + 8;

  return (
    <div style={{
      position: 'fixed',
      top:      Math.max(8, rect.top - 8),
      left,
      zIndex:   200,
      background:   '#1e293b',
      border:       '1px solid #334155',
      borderRadius: '0.75rem',
      padding:      '0.85rem 1rem',
      minWidth:     '210px',
      boxShadow:    '0 12px 32px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      fontSize:     '0.8rem',
      lineHeight:   1.6,
    }}>
      <div style={{ fontWeight: '700', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#f1f5f9' }}>
        {tarea.titulo}
      </div>
      <div style={{ color: '#94a3b8' }}>👤 {tarea.asignado?.nombre || 'Sin asignar'}</div>
      <div style={{ color: '#94a3b8' }}>📌 {ESTADO_LABELS[tarea.estado] || tarea.estado}</div>
      <div style={{ color: '#94a3b8' }}>📅 Inicio: {fmtLarga(tarea.creadoEn)}</div>
      <div style={{ color: tarea.venceEn ? '#94a3b8' : '#f87171' }}>
        🏁 Límite: {fmtLarga(tarea.venceEn)}
      </div>
      {tarea.dependeDeId && (
        <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #334155', color: '#fb923c', fontWeight: '600' }}>
          ⚠️ Bloqueada por tarea #{tarea.dependeDeId}
        </div>
      )}
    </div>
  );
};

// ── GanttView ────────────────────────────────────────────────────────────────
const GanttView = ({ proyecto, tareas }) => {
  const [tooltip, setTooltip] = useState(null); // { tarea, rect }

  // ── Calcular rango del timeline ───────────────────────────────────────────
  const calcularRango = useCallback(() => {
    // Inicio = mínimo entre creadoEn del proyecto y de sus tareas
    let inicio = new Date(proyecto.creadoEn);
    tareas.forEach(t => {
      const d = new Date(t.creadoEn);
      if (d < inicio) inicio = d;
    });

    // Fin = máximo entre venceEn de tareas o 30 días a partir del inicio
    let fin = new Date(inicio);
    fin.setDate(fin.getDate() + 30);
    tareas.forEach(t => {
      if (t.venceEn) {
        const d = new Date(t.venceEn);
        if (d > fin) fin = d;
      }
    });

    // Padding: 2 días antes y 3 días después
    inicio.setDate(inicio.getDate() - 2);
    fin.setDate(fin.getDate() + 3);
    return { inicio, fin };
  }, [proyecto, tareas]);

  const { inicio, fin } = calcularRango();
  const totalMs   = fin - inicio;
  const totalDias = totalMs / 86400000;

  // Fecha → porcentaje (0–100) dentro del timeline
  const pct = (fecha) => {
    if (!fecha) return null;
    return Math.max(0, Math.min(100, (new Date(fecha) - inicio) / totalMs * 100));
  };

  // Color de la barra según área del asignado (o del creador del proyecto)
  const getColor = (tarea) => {
    const area = tarea.asignado?.area || proyecto?.creador?.area;
    return AREA_COLORS[area] || AREA_COLORS.DEFAULT;
  };

  // ── Marcadores de fecha para el eje X ─────────────────────────────────────
  const generarMarcadores = () => {
    const intervalo = totalDias <= 14 ? 1 : totalDias <= 45 ? 7 : totalDias <= 120 ? 14 : 30;
    const marcas = [];
    const cur = new Date(inicio);
    cur.setHours(0, 0, 0, 0);
    while (cur <= fin) {
      const p = pct(cur);
      if (p != null) marcas.push({ fecha: new Date(cur), p });
      cur.setDate(cur.getDate() + intervalo);
    }
    return marcas;
  };

  const marcadores = generarMarcadores();
  const hoyPct     = pct(new Date());
  const LABEL_W    = 180; // px ancho columna de nombres

  if (tareas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
        No hay tareas para mostrar en el Gantt.
      </div>
    );
  }

  return (
    <>
      {/* Tooltip global */}
      {tooltip && <Tooltip tarea={tooltip.tarea} rect={tooltip.rect} />}

      <div style={{
        background:   'var(--color-surface-2)',
        border:       '1px solid var(--color-border)',
        borderRadius: '1rem',
        overflow:     'hidden',
      }}>
        {/* Leyenda de áreas */}
        <div style={{
          display: 'flex', gap: '1rem', padding: '0.85rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>Área:</span>
          {Object.entries({ DESARROLLO: 'Desarrollo', ADMINISTRACION: 'Administración', COMUNICACION: 'Comunicación' }).map(([k, label]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: AREA_COLORS[k].bar }} />
              <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#f87171' }}>
            <div style={{ width: '2px', height: '12px', background: '#f87171' }} />
            Hoy
          </div>
        </div>

        {/* Gantt scrollable */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: `${LABEL_W + Math.max(600, totalDias * 18)}px` }}>

            {/* ── Eje X (fechas) ── */}
            <div style={{
              display:    'flex',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              position:   'sticky',
              top:        0,
              zIndex:     10,
            }}>
              {/* Celda vacía sobre los nombres */}
              <div style={{
                width:      LABEL_W, flexShrink: 0,
                padding:    '0.6rem 1rem',
                fontSize:   '0.72rem', color: 'var(--color-text-muted)',
                fontWeight: '600',
                borderRight: '1px solid var(--color-border)',
              }}>
                Tarea
              </div>

              {/* Timeline header con marcadores */}
              <div style={{ flex: 1, position: 'relative', height: '36px' }}>
                {marcadores.map(({ fecha, p }, i) => (
                  <div key={i} style={{
                    position:  'absolute',
                    left:      `${p}%`,
                    top:       0,
                    height:    '100%',
                    display:   'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    transform: 'translateX(-1px)',
                  }}>
                    {/* Línea vertical sutil */}
                    <div style={{ width: '1px', flex: 1, background: 'var(--color-border)', opacity: 0.6 }} />
                    {/* Label de fecha */}
                    <div style={{
                      position:   'absolute',
                      bottom:     4,
                      left:       3,
                      fontSize:   '0.65rem',
                      fontWeight: '600',
                      color:      'var(--color-text-muted)',
                      whiteSpace: 'nowrap',
                    }}>
                      {fmtCorta(fecha)}
                    </div>
                  </div>
                ))}

                {/* Línea "hoy" en el header */}
                {hoyPct != null && hoyPct >= 0 && hoyPct <= 100 && (
                  <div style={{
                    position: 'absolute', left: `${hoyPct}%`,
                    top: 0, bottom: 0, width: '2px',
                    background: '#f87171', opacity: 0.9,
                  }} />
                )}
              </div>
            </div>

            {/* ── Filas de tareas ── */}
            {tareas.map((tarea, idx) => {
              const color   = getColor(tarea);
              const barLeft = pct(tarea.creadoEn) ?? 0;
              const barEnd  = tarea.venceEn ? pct(tarea.venceEn) : 100;
              const barW    = Math.max(1, barEnd - barLeft);
              const sinFecha = !tarea.venceEn;
              const vencido  = tarea.venceEn && new Date(tarea.venceEn) < new Date() && tarea.estado !== 'HECHO';

              return (
                <div key={tarea.id} style={{
                  display:    'flex',
                  borderBottom: idx < tareas.length - 1 ? '1px solid var(--color-border)' : 'none',
                  minHeight:  '44px',
                }}>
                  {/* ── Nombre de la tarea ── */}
                  <div style={{
                    width:       LABEL_W, flexShrink: 0,
                    padding:     '0 0.85rem',
                    display:     'flex', alignItems: 'center',
                    borderRight: '1px solid var(--color-border)',
                    background:  'var(--color-surface)',
                    position:    'sticky', left: 0, zIndex: 5,
                  }}>
                    <div style={{
                      fontSize:    '0.78rem',
                      fontWeight:  '500',
                      overflow:    'hidden',
                      textOverflow:'ellipsis',
                      whiteSpace:  'nowrap',
                      color: tarea.estado === 'HECHO' ? 'var(--color-text-muted)' : 'var(--color-text)',
                      textDecoration: tarea.estado === 'HECHO' ? 'line-through' : 'none',
                    }}>
                      {tarea.titulo}
                    </div>
                  </div>

                  {/* ── Área de barras ── */}
                  <div style={{
                    flex:     1,
                    position: 'relative',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    {/* Líneas de cuadrícula (mismas posiciones que el header) */}
                    {marcadores.map(({ p }, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: `${p}%`,
                        top: 0, bottom: 0, width: '1px',
                        background: 'var(--color-border)', opacity: 0.4,
                      }} />
                    ))}

                    {/* Línea "hoy" */}
                    {hoyPct != null && hoyPct >= 0 && hoyPct <= 100 && (
                      <div style={{
                        position: 'absolute', left: `${hoyPct}%`,
                        top: 0, bottom: 0, width: '2px',
                        background: '#f87171', opacity: 0.6, zIndex: 2,
                      }} />
                    )}

                    {/* ── Barra de la tarea ── */}
                    <div
                      onMouseEnter={(e) => setTooltip({ tarea, rect: e.currentTarget.getBoundingClientRect() })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        position:     'absolute',
                        left:         `${barLeft}%`,
                        width:        `${barW}%`,
                        top:          '50%',
                        transform:    'translateY(-50%)',
                        height:       '22px',
                        borderRadius: '4px',
                        background:   sinFecha
                          ? `repeating-linear-gradient(90deg, ${color.bar}CC 0px, ${color.bar}CC 8px, transparent 8px, transparent 14px)`
                          : color.bar,
                        border:       `1px solid ${color.bar}`,
                        opacity:      tarea.estado === 'HECHO' ? 0.55 : 1,
                        cursor:       'pointer',
                        transition:   'filter 0.15s, transform 0.15s',
                        zIndex:       3,
                        outline:      vencido ? '2px solid #f87171' : 'none',
                        outlineOffset: '1px',
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.filter = 'brightness(1.2)';
                        e.currentTarget.style.transform = 'translateY(-50%) scaleY(1.15)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.filter = 'none';
                        e.currentTarget.style.transform = 'translateY(-50%) scaleY(1)';
                      }}
                    >
                      {/* Label dentro de la barra (si hay espacio) */}
                      {barW > 8 && (
                        <div style={{
                          position:   'absolute',
                          inset:      0,
                          display:    'flex',
                          alignItems: 'center',
                          padding:    '0 6px',
                          fontSize:   '0.65rem',
                          fontWeight: '700',
                          color:      '#fff',
                          whiteSpace: 'nowrap',
                          overflow:   'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {tarea.dependeDeId && <span style={{ marginRight: '4px' }} title="Bloqueada por otra tarea">🔒</span>}
                          {tarea.asignado?.nombre?.split(' ')[0] || ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Footer con rango del timeline */}
            <div style={{
              display:    'flex',
              padding:    '0.5rem 1rem 0.5rem',
              fontSize:   '0.7rem',
              color:      'var(--color-text-muted)',
              borderTop:  '1px solid var(--color-border)',
              gap:        '1rem',
            }}>
              <span style={{ width: LABEL_W, flexShrink: 0 }} />
              <span>📆 {fmtLarga(inicio)} — {fmtLarga(fin)} ({Math.round(totalDias)} días)</span>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default GanttView;
