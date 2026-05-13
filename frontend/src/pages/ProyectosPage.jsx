// Página de Proyectos (Material Design Premium)
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { proyectosService, usuariosService } from '../services/api';
import Spinner from '../components/Spinner';
import { 
  Code2, 
  BarChart3, 
  Mail, 
  Folder,
  Trash2, 
  Plus,
  FolderOpen, 
  ChevronRight, 
  Pencil
} from 'lucide-react';

// ── Configuraciones Visuales ────────────────────────────────────────────────
const AREA_CONF = {
  DESARROLLO:     { label: 'Desarrollo',     color: '#2563eb', bg: 'rgba(37,99,235,0.08)', icon: <Code2 size={14} /> },
  ADMINISTRACION: { label: 'Administración', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: <BarChart3 size={14} /> },
  COMUNICACION:   { label: 'Comunicación',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: <Mail size={14} /> },
};

const ESTADOS = [
  { value: 'ACTIVO',   label: 'Activo',   color: '#00d166', bg: 'rgba(0,209,102,0.12)' },
  { value: 'EN_PAUSA', label: 'En pausa', color: '#ff9100', bg: 'rgba(255,145,0,0.12)' },
  { value: 'CERRADO',  label: 'Cerrado',  color: '#6c757d', bg: 'rgba(108,117,125,0.12)' },
];

// ── Tarjeta de Proyecto ─────────────────────────────────────────────────────
const ProyectoCard = ({ proyecto, onEditar, onEliminar, onVerDetalle, esAdmin }) => {
  const area = AREA_CONF[proyecto.area] || { label: proyecto.area, color: '#94a3b8', bg: 'rgba(255,255,255,0.05)', icon: <Folder size={14} /> };
  const estado = ESTADOS.find(e => e.value === proyecto.estado) || ESTADOS[0];
  
  // Calcular progreso real basado en tareas HECHO
  const total = proyecto._count?.tareas || 0;
  // Nota: necesitamos que el backend nos devuelva el conteo de hechas o calcularlo aquí si tenemos las tareas
  // Por ahora simularemos un porcentaje o usaremos el dato si estuviera disponible. 
  // En este punto el listado de proyectos usualmente solo trae _count.
  const progreso = proyecto.progreso || 0; 

  return (
    <div 
      onClick={onVerDetalle}
      className="card" 
      style={{ 
        padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1.25rem',
        border: '1px solid var(--color-border)', transition: 'var(--transition-base)',
        background: 'var(--color-surface)', borderRadius: '16px'
      }}
      onMouseOver={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        e.currentTarget.style.borderColor = 'var(--color-primary-light)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-text)', marginBottom: '0.25rem' }}>{proyecto.nombre}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: estado.color, background: estado.bg, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
              {estado.label}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
              {area.label}
            </span>
          </div>
        </div>
        <div style={{ color: 'var(--color-primary)', opacity: 0.6, display: 'flex' }}>
          <ChevronRight size={20} />
        </div>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', lineHeight: 1.5, minHeight: '2.7rem' }}>
        {proyecto.descripcion || 'Gestión operativa del proyecto y seguimiento de hitos.'}
      </p>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: '700' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Progreso</span>
          <span style={{ color: 'var(--color-text)' }}>{progreso}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--color-bg-base)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', width: `${progreso}%`, 
            background: 'var(--color-primary)', borderRadius: '10px',
            transition: 'width 1s ease-in-out'
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800', border: '1px solid var(--color-border)' }}>
            {proyecto.creador?.nombre?.charAt(0)}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text-dim)' }}>{total} Tareas</span>
        </div>
        
        {esAdmin && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); onEditar(proyecto); }}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text)' }}
            >
              <Pencil size={12} /> Editar
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEliminar(proyecto); }}
              style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: 'none', color: 'var(--color-accent-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Modal de Proyecto ────────────────────────────────────────────────────────
const ModalProyecto = ({ proyecto, onClose, onGuardar }) => {
  const [form, setForm] = useState({
    nombre: proyecto?.nombre || '',
    descripcion: proyecto?.descripcion || '',
    estado: proyecto?.estado || 'ACTIVO',
    area: proyecto?.area || 'DESARROLLO',
    fechaInicio: proyecto?.fechaInicio ? proyecto.fechaInicio.slice(0, 10) : new Date().toISOString().slice(0, 10),
    fechaFin: proyecto?.fechaFin ? proyecto.fechaFin.slice(0, 10) : '',
    miembrosIds: proyecto?.miembros?.map(m => m.id) || [],
  });
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    usuariosService.listar().then(d => setUsuarios(d.usuarios)).catch(console.error);
  }, []);

  // Filtrar usuarios por el área seleccionada
  const usuariosFiltrados = usuarios.filter(u => u.area === form.area);

  const toggleMiembro = (id) => {
    setForm(prev => {
      const exists = prev.miembrosIds.includes(id);
      if (exists) return { ...prev, miembrosIds: prev.miembrosIds.filter(x => x !== id) };
      return { ...prev, miembrosIds: [...prev.miembrosIds, id] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (proyecto) await proyectosService.editar(proyecto.id, form);
      else await proyectosService.crear(form);
      onGuardar();
    } catch (err) { alert(err.message); }
    finally { setCargando(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '550px', background: 'var(--color-surface)', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '2rem' }}>{proyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">NOMBRE DEL PROYECTO</label>
            <input className="form-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required placeholder="Ej: Rediseño de Marca" />
          </div>
          <div className="form-group">
            <label className="form-label">DESCRIPCIÓN</label>
            <textarea className="form-input" rows="3" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Objetivos y alcance..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">ESTADO</label>
              <select className="form-input form-select" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ÁREA RESPONSABLE</label>
              <select 
                className="form-input form-select" 
                value={form.area} 
                onChange={e => setForm({...form, area: e.target.value, miembrosIds: []})}
              >
                {Object.keys(AREA_CONF).map(k => <option key={k} value={k}>{AREA_CONF[k].label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">FECHA INICIO</label>
              <input type="date" className="form-input" value={form.fechaInicio} onChange={e => setForm({...form, fechaInicio: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">FECHA FIN (OPCIONAL)</label>
              <input type="date" className="form-input" value={form.fechaFin} onChange={e => setForm({...form, fechaFin: e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">SELECCIONAR RESPONSABLES ({form.area})</label>
            <div style={{ 
              display: 'flex', flexWrap: 'wrap', gap: '0.5rem', 
              padding: '1rem', background: 'var(--color-surface-2)', 
              borderRadius: '1rem', border: '1px solid var(--color-border)',
              minHeight: '60px'
            }}>
              {usuariosFiltrados.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>No hay usuarios en esta área</span>
              ) : (
                usuariosFiltrados.map(u => {
                  const isSelected = form.miembrosIds.includes(u.id);
                  return (
                    <button
                      key={u.id} type="button"
                      onClick={() => toggleMiembro(u.id)}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid',
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                        color: isSelected ? '#fff' : 'var(--color-text)',
                        fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '}{u.nombre}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border-light)' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)', padding: '0.8rem', borderRadius: '0.85rem', cursor: 'pointer', fontWeight: '700' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={cargando}>{cargando ? 'GUARDANDO...' : 'GUARDAR PROYECTO'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Componente Principal ─────────────────────────────────────────────────────
const ProyectosPage = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const esAdmin = usuario?.rol === 'ADMIN';

  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('TODOS');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await proyectosService.listar();
      setProyectos(data.proyectos);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setCargando(false); }
  }, [showToast]);

  useEffect(() => {
    const fetch = async () => {
      await cargar();
    };
    fetch();
  }, [cargar]);

  const handleEliminar = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try {
      await proyectosService.eliminar(p.id);
      setProyectos(prev => prev.filter(x => x.id !== p.id));
      showToast('Proyecto eliminado');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const filtrados = filtro === 'TODOS' ? proyectos : proyectos.filter(p => p.estado === filtro);

  if (cargando) return <Spinner texto="Sincronizando proyectos..." />;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight" style={{ fontSize: '2.5rem', lineHeight: 1 }}>Proyectos</h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Gestión estratégica y operativa del equipo</p>
        </div>
        {esAdmin && (
          <button onClick={() => { setEditando(null); setModal(true); }} className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '240px', justifyContent: 'center' }}>
            <Plus size={18} /> Nuevo Proyecto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {['TODOS', 'ACTIVO', 'EN_PAUSA', 'CERRADO'].map(f => (
          <button
            key={f} onClick={() => setFiltro(f)}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '999px', border: '1px solid var(--color-border)',
              background: filtro === f ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: filtro === f ? '#fff' : 'var(--color-text-muted)',
              fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {f === 'TODOS' ? 'Todos' : ESTADOS.find(e => e.value === f)?.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="card" style={{ padding: '5rem', textAlign: 'center', border: '2px dashed var(--color-border)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: 'var(--color-text-dim)' }}><FolderOpen size={48} /></div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-dim)' }}>No se encontraron proyectos</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Comienza creando uno nuevo o cambia el filtro.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filtrados.map(p => (
            <ProyectoCard 
              key={p.id} proyecto={p} esAdmin={esAdmin} 
              onEditar={setEditando} 
              onEliminar={handleEliminar}
              onVerDetalle={() => navigate(`/proyectos/${p.id}`)}
            />
          ))}
        </div>
      )}

      {modal && <ModalProyecto proyecto={editando} onClose={() => setModal(false)} onGuardar={() => { setModal(false); cargar(); }} />}
    </div>
  );
};

export default ProyectosPage;
