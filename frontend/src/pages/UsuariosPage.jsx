// Página de Gestión de Usuarios (Solo Admin)
import { useState, useEffect } from 'react';
import { usuariosService } from '../services/api';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';

const AREAS = ['DESARROLLO', 'ADMINISTRACION', 'COMUNICACION'];
const ROLES = ['MIEMBRO', 'ADMIN'];

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModal] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const { showToast } = useToast();

  const fetchUsuarios = async () => {
    try {
      const data = await usuariosService.listar();
      setUsuarios(data.usuarios);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleEliminar = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      await usuariosService.eliminar(id);
      setUsuarios(prev => prev.filter(u => u.id !== id));
      showToast('Usuario eliminado', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleGuardar = () => {
    setModal(false);
    setUsuarioEditando(null);
    fetchUsuarios();
  };

  if (cargando) return <Spinner texto="Cargando equipo..." />;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>Gestión de Equipo</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Administra los miembros, roles y accesos del CRM.</p>
        </div>
        <button 
          onClick={() => { setUsuarioEditando(null); setModal(true); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>➕</span> Nuevo Miembro
        </button>
      </div>

      <div style={{ 
        background: 'var(--color-surface-2)', 
        borderRadius: '1rem', 
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>MIEMBRO</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>ÁREA</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>ROL</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>REGISTRO</th>
              <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '10px', 
                      background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '800', color: 'var(--color-primary)'
                    }}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700' }}>{u.nombre}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '999px',
                    background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)'
                  }}>{u.area}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '999px',
                    background: u.rol === 'ADMIN' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                    color: u.rol === 'ADMIN' ? '#f59e0b' : '#10b981'
                  }}>{u.rol}</span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {new Date(u.creadoEn).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => { setUsuarioEditando(u); setModal(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', marginRight: '0.5rem' }}
                    title="Editar"
                  >✏️</button>
                  <button 
                    onClick={() => handleEliminar(u.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                    title="Eliminar"
                  >🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <ModalUsuario 
          usuario={usuarioEditando} 
          onClose={() => { setModal(false); setUsuarioEditando(null); }}
          onGuardar={handleGuardar}
        />
      )}
    </div>
  );
};

const ModalUsuario = ({ usuario, onClose, onGuardar }) => {
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    password: '',
    area: usuario?.area || 'DESARROLLO',
    rol: usuario?.rol || 'MIEMBRO'
  });
  const [cargando, setCargando] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      if (usuario) {
        await usuariosService.editar(usuario.id, form);
        showToast('Usuario actualizado', 'success');
      } else {
        await usuariosService.crear(form);
        showToast('Usuario creado', 'success');
      }
      onGuardar();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ 
        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', 
        borderRadius: '1.25rem', padding: '2rem', width: '100%', maxWidth: '450px',
        animation: 'fadeSlideIn 0.2s ease'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem' }}>
          {usuario ? 'Editar Miembro' : 'Nuevo Miembro'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input 
              type="text" className="form-input" required 
              value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input 
              type="email" className="form-input" required 
              value={form.email} onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {usuario ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
            </label>
            <input 
              type="password" className="form-input" required={!usuario}
              value={form.password} onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Área</label>
              <select className="form-input form-select" value={form.area} onChange={e => setForm({...form, area: e.target.value})}>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select className="form-input form-select" value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '0.6rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="btn-primary" style={{ flex: 1 }}>
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuariosPage;
