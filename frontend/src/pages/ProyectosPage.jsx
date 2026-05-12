// Página de Proyectos
// Lista de proyectos en tarjetas, modal de crear/editar, botones de eliminar

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { proyectosService, usuariosService } from '../services/api';
import Spinner from '../components/Spinner';

// ── Constantes de área ──────────────────────────────────────────────────────
const AREA_CONFIG = {
  DESARROLLO:     { label: 'Desarrollo',     color: '#6366f1', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.35)',  icon: '💻' },
  ADMINISTRACION: { label: 'Administración', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)',  icon: '📊' },
  COMUNICACION:   { label: 'Comunicación',   color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', icon: '📢' },
};

const ESTADOS = ['ACTIVO', 'EN_PAUSA', 'CERRADO'];

// ── Modal crear/editar ──────────────────────────────────────────────────────
const Modal = ({ proyecto, onClose, onGuardar }) => {
  const [form, setForm]         = useState({
    nombre:      proyecto?.nombre      || '',
    descripcion: proyecto?.descripcion || '',
    estado:      proyecto?.estado      || 'ACTIVO',
    primerComentario: '',
    miembrosIds: proyecto?.miembros?.map(m => m.id) || [],
  });
  const [usuarios, setUsuarios] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [error, setError]       = useState('');
  const [cargando, setCargando] = useState(false);

  // Cargar usuarios para el selector
  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const { usuarios } = await usuariosService.listar();
        setUsuarios(usuarios);
      } catch (err) {
        console.error('Error al cargar usuarios', err);
      }
    };
    cargarUsuarios();
  }, []);

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleToggleMiembro = (id) => {
    setForm(prev => {
      const ids = [...prev.miembrosIds];
      if (ids.includes(id)) {
        return { ...prev, miembrosIds: ids.filter(mid => mid !== id) };
      } else {
        return { ...prev, miembrosIds: [...ids, id] };
      }
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setCargando(true);
    try {
      if (proyecto) {
        await proyectosService.editar(proyecto.id, form);
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (k === 'miembrosIds') {
            fd.append(k, JSON.stringify(v));
          } else if (v) {
            fd.append(k, v);
          }
        });
        archivos.forEach(file => {
          fd.append('archivos', file);
        });
        await proyectosService.crear(fd);
      }
      onGuardar(!!proyecto);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    // Fondo oscuro semitransparente
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
        padding: '1.75rem',
        width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        animation: 'fadeSlideIn 0.18s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
            {proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--color-text-muted)',
              fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1, padding: '0.2rem',
            }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {error && <div className="alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="modal-nombre">Nombre del proyecto</label>
            <input
              id="modal-nombre" name="nombre" type="text"
              className="form-input" required
              placeholder="Ej. Rediseño web Q3"
              value={form.nombre} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-desc">Descripción (opcional)</label>
            <textarea
              id="modal-desc" name="descripcion"
              className="form-input"
              placeholder="Describe el objetivo del proyecto..."
              rows={2}
              value={form.descripcion} onChange={handleChange}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="modal-estado">Estado</label>
              <select
                id="modal-estado" name="estado"
                className="form-input form-select"
                value={form.estado} onChange={handleChange}
              >
                {ESTADOS.map(e => (
                  <option key={e} value={e}>
                    {e === 'ACTIVO' ? '🟢 Activo' : e === 'EN_PAUSA' ? '🟡 En pausa' : '🔴 Cerrado'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Miembros involucrados</label>
              <div style={{
                background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                padding: '0.65rem',
                minHeight: '100px', maxHeight: '150px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '0.5rem'
              }}>
                {usuarios.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '1.5rem' }}>
                    Cargando equipo...
                  </span>
                ) : (
                  usuarios.map(u => (
                    <label key={u.id} style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.65rem', 
                      cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem',
                      borderRadius: '0.25rem', transition: 'background 0.15s'
                    }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <input 
                        type="checkbox" 
                        checked={form.miembrosIds.includes(u.id)} 
                        onChange={() => handleToggleMiembro(u.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                          color: form.miembrosIds.includes(u.id) ? 'var(--color-primary)' : 'var(--color-text)',
                          fontWeight: form.miembrosIds.includes(u.id) ? '700' : '500'
                        }}>
                          {u.nombre}
                        </span>
                        <small style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                          {u.rol} • {u.area}
                        </small>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {!proyecto && (
            <>
              {/* Primer Comentario */}
              <div className="form-group" style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <label className="form-label" htmlFor="modal-com">Contexto Inicial / Primer Comentario</label>
                <textarea
                  id="modal-com" name="primerComentario"
                  className="form-input"
                  placeholder="Explica el contexto o pasos iniciales..."
                  rows={2}
                  value={form.primerComentario} onChange={handleChange}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Archivos */}
              <div className="form-group">
                <label className="form-label">Adjuntar Documentación Inicial</label>
                <input 
                  type="file" multiple 
                  onChange={e => setArchivos([...e.target.files])}
                  style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '0.7rem',
                background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                color: 'var(--color-text-muted)',
                cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem',
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={cargando} style={{ flex: 1 }}>
              {cargando ? 'Guardando...' : proyecto ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Tarjeta de Proyecto ─────────────────────────────────────────────────────
const ProyectoCard = ({ proyecto, onEditar, onEliminar, onVerDetalle, esAdmin }) => {
  const area = AREA_CONFIG[proyecto.creador?.area] || {
    label: proyecto.creador?.area, color: '#94a3b8', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', icon: '📁',
  };

  const estadoBadge = {
    ACTIVO:   { label: 'Activo',   color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
    EN_PAUSA: { label: 'En pausa', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
    CERRADO:  { label: 'Cerrado',  color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  }[proyecto.estado] || { label: proyecto.estado, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: `1px solid ${area.border}`,
      borderRadius: '1rem',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${area.color}22`; }}
      onMouseOut={e  => { e.currentTarget.style.transform = 'none';              e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Cabecera: área + estado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.25rem 0.7rem', borderRadius: '999px',
          background: area.bg, color: area.color,
          fontSize: '0.72rem', fontWeight: '600',
        }}>
          {area.icon} {area.label}
        </span>
        <span style={{
          padding: '0.25rem 0.65rem', borderRadius: '999px',
          background: estadoBadge.bg, color: estadoBadge.color,
          fontSize: '0.85rem', fontWeight: '700',
        }}>
          {estadoBadge.label}
        </span>
      </div>

      {/* Nombre y descripción — click navega al detalle */}
      <div onClick={onVerDetalle} style={{ cursor: 'pointer' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.35rem', lineHeight: 1.3, color: 'var(--color-text)', transition: 'color 0.15s' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseOut={e  => e.currentTarget.style.color = 'var(--color-text)'}
        >
          {proyecto.nombre}
        </h3>
        {proyecto.descripcion && (
          <p style={{
            fontSize: '1.05rem', color: 'var(--color-text-muted)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {proyecto.descripcion}
          </p>
        )}
      </div>

      {/* Metadata: creador y tareas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          👤 {proyecto.creador?.nombre}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          📋 {proyecto._count?.tareas} tarea{proyecto._count?.tareas !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Acciones — solo visibles para ADMIN */}
      {esAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={() => onEditar(proyecto)}
            style={{
              flex: 1, padding: '0.45rem',
              background: 'var(--color-surface-3)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.4rem',
              color: 'var(--color-text)',
              fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#475569'}
            onMouseOut={e  => e.currentTarget.style.background = 'var(--color-surface-3)'}
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => onEliminar(proyecto)}
            style={{
              padding: '0.45rem 0.75rem',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: '0.4rem',
              color: 'var(--color-error)',
              fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(248,113,113,0.2)'}
            onMouseOut={e  => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
          >
            🗑️
          </button>
        </div>
      )}

    </div>
  );
};

// ── Página principal ────────────────────────────────────────────────────────
const ProyectosPage = () => {
  const { usuario } = useAuth();
  const navigate    = useNavigate();
  const { showToast } = useToast();
  const esAdmin     = usuario?.rol === 'ADMIN';

  const [proyectos, setProyectos]           = useState([]);
  const [cargando, setCargando]             = useState(true);
  const [error, setError]                   = useState('');
  const [modalAbierto, setModalAbierto]     = useState(false);
  const [proyectoEditando, setProyectoEditando] = useState(null);
  const [filtroEstado, setFiltroEstado]     = useState('TODOS');
  const [filtradoPorUsuario, setFiltradoPorUsuario] = useState(false);

  // Cargar proyectos del backend
  const cargarProyectos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await proyectosService.listar();
      setProyectos(data.proyectos);
      setFiltradoPorUsuario(data.filtradoPorUsuario ?? false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await cargarProyectos();
    };
    init();
  }, [cargarProyectos]);

  // Abrir modal para crear
  const handleCrear = () => {
    setProyectoEditando(null);
    setModalAbierto(true);
  };

  // Abrir modal para editar
  const handleEditar = (proyecto) => {
    setProyectoEditando(proyecto);
    setModalAbierto(true);
  };

  // Eliminar con confirmación
  const handleEliminar = async (proyecto) => {
    if (!window.confirm(`¿Eliminar el proyecto "${proyecto.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await proyectosService.eliminar(proyecto.id);
      setProyectos(prev => prev.filter(p => p.id !== proyecto.id));
      showToast('Proyecto eliminado', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Al guardar en el modal, recargar la lista, mostrar toast y cerrar
  const handleGuardar = (esEdicion) => {
    setModalAbierto(false);
    showToast(esEdicion ? 'Proyecto actualizado' : 'Proyecto creado con éxito', 'success');
    cargarProyectos();
  };

  // Exportar todos los proyectos como JSON
  const handleExportar = () => {
    const datos = {
      exportadoEn: new Date().toISOString(),
      total: proyectos.length,
      proyectos,
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `proyectos-crm-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Proyectos exportados correctamente', 'success');
  };

  // Filtrado local por estado
  const proyectosFiltrados = filtroEstado === 'TODOS'
    ? proyectos
    : proyectos.filter(p => p.estado === filtroEstado);

  return (
    <>
      {/* Animación del modal */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.25rem' }}>Proyectos</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.15rem' }}>
              {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''} en total
            </p>
          </div>
          {esAdmin && (
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Exportar JSON */}
              <button
                onClick={handleExportar}
                title="Exportar todos los proyectos como JSON"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.6rem 1rem',
                  background: 'var(--color-surface-3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.6rem',
                  color: 'var(--color-text-muted)', fontWeight: '500', fontSize: '0.82rem',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = 'var(--color-text)'; }}
                onMouseOut={e  => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                ⬇️ Exportar JSON
              </button>

              {/* Nuevo proyecto */}
              <button
                onClick={handleCrear}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.65rem 1.25rem',
                  background: 'var(--color-primary)',
                  border: 'none', borderRadius: '0.6rem',
                  color: '#fff', fontWeight: '600', fontSize: '0.875rem',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--color-primary-dark)'}
                onMouseOut={e  => e.currentTarget.style.background = 'var(--color-primary)'}
              >
                + Nuevo proyecto
              </button>
            </div>
          )}
        </div>

        {/* Banner: vista filtrada para miembros */}
        {filtradoPorUsuario && (
          <div style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '0.75rem',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
            fontSize: '0.84rem', color: 'var(--color-text)',
          }}>
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
            <p style={{ margin: 0 }}>
              Estás viendo solo los <strong>proyectos donde tienes tareas asignadas</strong>.
              El administrador puede ver la lista completa.
            </p>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {['TODOS', ...ESTADOS].map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '999px',
                border: '1px solid',
                fontSize: '0.8rem', fontWeight: '500',
                cursor: 'pointer', transition: 'all 0.15s',
                borderColor: filtroEstado === estado ? 'var(--color-primary)' : 'var(--color-border)',
                background:   filtroEstado === estado ? 'var(--color-primary)' : 'transparent',
                color:        filtroEstado === estado ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {estado === 'TODOS' ? 'Todos' : estado === 'ACTIVO' ? 'Activos' : estado === 'EN_PAUSA' ? 'En pausa' : 'Cerrados'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Grid de proyectos */}
        {cargando ? (
          <Spinner texto="Cargando proyectos..." />
        ) : proyectosFiltrados.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: 'var(--color-surface-2)',
            border: '1px dashed var(--color-border)',
            borderRadius: '1rem',
            color: 'var(--color-text-muted)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
            <div style={{ fontWeight: '600', marginBottom: '0.4rem' }}>
              {filtroEstado === 'TODOS' ? 'Aún no hay proyectos' : `No hay proyectos "${filtroEstado.toLowerCase()}"`}
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              {filtroEstado === 'TODOS' ? 'Crea el primer proyecto con el botón de arriba.' : 'Prueba con otro filtro.'}
            </div>
          </div>
        ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}>
            {proyectosFiltrados.map(proyecto => (
              <ProyectoCard
                key={proyecto.id}
                proyecto={proyecto}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                onVerDetalle={() => navigate(`/proyectos/${proyecto.id}`)}
                esAdmin={esAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <Modal
          proyecto={proyectoEditando}
          onClose={() => setModalAbierto(false)}
          onGuardar={handleGuardar}
        />
      )}
    </>
  );
};

export default ProyectosPage;
