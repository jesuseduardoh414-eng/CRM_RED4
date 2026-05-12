// Página de Gestión de Usuarios (Solo Admin)
import { useState, useEffect, useCallback } from 'react';
import { usuariosService } from '../services/api';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import { 
  Pencil, 
  Trash2, 
  UserPlus
} from 'lucide-react';

const AREAS = ['DESARROLLO', 'ADMINISTRACION', 'COMUNICACION'];
const ROLES = ['MIEMBRO', 'ADMIN'];

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModal] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const { showToast } = useToast();

  const fetchUsuarios = useCallback(async () => {
    try {
      const data = await usuariosService.listar();
      setUsuarios(data.usuarios);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const handleEliminar = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      await usuariosService.eliminar(id);
      setUsuarios(prev => prev.filter(u => u.id !== id));
      showToast('Usuario eliminado', 'success');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const handleGuardar = () => {
    setModal(false);
    setUsuarioEditando(null);
    fetchUsuarios();
  };

  if (cargando) return <Spinner texto="Cargando equipo..." />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.75rem' }}>Gestión de Equipo</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>Administra los miembros, roles y accesos del sistema.</p>
        </div>
        <button 
          onClick={() => { setUsuarioEditando(null); setModal(true); }}
          className="btn-primary"
          style={{ padding: '0.8rem 1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <UserPlus size={18} /> Nuevo Miembro
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', color: 'var(--color-text-dim)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MIEMBRO</th>
              <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', color: 'var(--color-text-dim)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ÁREA</th>
              <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', color: 'var(--color-text-dim)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ROL</th>
              <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', color: 'var(--color-text-dim)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REGISTRO</th>
              <th style={{ textAlign: 'right', padding: '1.25rem 1.5rem', color: 'var(--color-text-dim)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-light)', transition: 'background 0.2s' }}>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '12px', 
                      background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '800', color: 'var(--color-primary-light)', fontSize: '1rem'
                    }}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{u.nombre}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ 
                    fontSize: '0.7rem', fontWeight: '800', padding: '0.25rem 0.75rem', borderRadius: '6px',
                    background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary-light)', textTransform: 'uppercase'
                  }}>{u.area}</span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ 
                    fontSize: '0.7rem', fontWeight: '800', padding: '0.25rem 0.75rem', borderRadius: '6px',
                    background: u.rol === 'ADMIN' ? 'rgba(255,145,0,0.1)' : 'rgba(0,209,102,0.1)',
                    color: u.rol === 'ADMIN' ? '#ff9100' : '#00d166', textTransform: 'uppercase'
                  }}>{u.rol}</span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                  {new Date(u.creadoEn).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setUsuarioEditando(u); setModal(true); }}
                      style={{ background: 'var(--color-surface-3)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}
                    ><Pencil size={14} /></button>
                    <button 
                      onClick={() => handleEliminar(u.id)}
                      style={{ background: 'rgba(244,63,94,0.05)', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-error)' }}
                    ><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <ModalUsuario 
          key={usuarioEditando?.id || 'nuevo'}
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
        showToast('Usuario actualizado');
      } else {
        await usuariosService.crear(form);
        showToast('Usuario creado');
      }
      onGuardar();
    } catch (error) { showToast(error.message, 'error'); }
    finally { setCargando(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', background: 'var(--color-surface-2)', padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '900', marginBottom: '2rem', letterSpacing: '-0.02em' }}>
          {usuario ? 'Editar Miembro' : 'Nuevo Miembro'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">NOMBRE COMPLETO</label>
            <input className="form-input" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej. Juan Pérez" />
          </div>

          <div className="form-group">
            <label className="form-label">CORREO ELECTRÓNICO</label>
            <input type="email" className="form-input" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="juan@empresa.com" />
          </div>

          <div className="form-group">
            <label className="form-label">{usuario ? 'NUEVA CONTRASEÑA (OPCIONAL)' : 'CONTRASEÑA'}</label>
            <input type="password" className="form-input" required={!usuario} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">ÁREA</label>
              <select className="form-input form-select" value={form.area} onChange={e => setForm({...form, area: e.target.value})}>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ROL</label>
              <select className="form-input form-select" value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '700', cursor: 'pointer' }}>CANCELAR</button>
            <button type="submit" disabled={cargando} className="btn-primary" style={{ flex: 1.5 }}>{cargando ? 'GUARDANDO...' : 'GUARDAR'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuariosPage;
