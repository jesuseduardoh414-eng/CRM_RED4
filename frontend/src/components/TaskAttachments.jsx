import { useState, useEffect } from 'react';
import { adjuntosService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TaskAttachments = ({ tareaId, type = 'tareas' }) => {
  const { usuario } = useAuth();
  const [adjuntos, setAdjuntos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  const fetchAdjuntos = async () => {
    try {
      const data = await adjuntosService.listar(tareaId, type);
      setAdjuntos(data.adjuntos);
    } catch (error) {
      console.error('Error al cargar adjuntos:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (tareaId) fetchAdjuntos();
  }, [tareaId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendo(true);
    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const data = await adjuntosService.subir(tareaId, formData, type);
      setAdjuntos(prev => [data.adjunto, ...prev]);
    } catch (error) {
      alert(error.message);
    } finally {
      setSubiendo(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este archivo?')) return;
    try {
      await adjuntosService.eliminar(id);
      setAdjuntos(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      alert(error.message);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (tipo) => {
    if (tipo?.includes('image')) return '🖼️';
    if (tipo?.includes('pdf'))   return '📕';
    if (tipo?.includes('word'))  return '📘';
    if (tipo?.includes('excel') || tipo?.includes('spreadsheet')) return '📗';
    if (tipo?.includes('zip') || tipo?.includes('rar')) return '📦';
    return '📄';
  };

  if (cargando) return <div style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Cargando archivos...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>📎</span>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '800' }}>
            {type === 'proyectos' ? 'Documentación del Proyecto' : 'Archivos Adjuntos'}
          </h4>
        </div>
        
        <label style={{ 
          background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
          borderRadius: '0.6rem', padding: '0.4rem 0.8rem', cursor: 'pointer',
          fontSize: '0.85rem', fontWeight: '700', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: '0.4rem'
        }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--color-border)'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--color-surface-3)'}
        >
          {subiendo ? 'Subiendo...' : 'Subir archivo'}
          <input type="file" onChange={handleFileUpload} disabled={subiendo} style={{ display: 'none' }} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {adjuntos.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', padding: '1.5rem', textAlign: 'center', 
            background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px dashed var(--color-border)'
          }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Sin documentos adjuntos.</p>
          </div>
        ) : (
          adjuntos.map(a => (
            <div key={a.id} style={{ 
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
              background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
              borderRadius: '0.75rem', transition: 'transform 0.2s, box-shadow 0.2s',
              position: 'relative'
            }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{getFileIcon(a.tipo)}</div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div 
                  onClick={() => adjuntosService.descargar(a.url)}
                  style={{ 
                    fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-text)', 
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    cursor: 'pointer'
                  }}
                  title={a.nombre}
                >
                  {a.nombre}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {formatSize(a.tamano)} • {new Date(a.creadoEn).toLocaleDateString()}
                </div>
              </div>

              {(a.usuarioId === usuario.id || usuario.rol === 'ADMIN') && (
                <button 
                  onClick={() => handleEliminar(a.id)}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = 1}
                  onMouseOut={e => e.currentTarget.style.opacity = 0.5}
                >🗑️</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskAttachments;
