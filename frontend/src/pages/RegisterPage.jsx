// Página de Registro
// Sin selector de rol — todos los nuevos usuarios son MIEMBRO automáticamente

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const AREAS = [
  { value: 'DESARROLLO',     label: '💻 Desarrollo'     },
  { value: 'ADMINISTRACION', label: '📊 Administración' },
  { value: 'COMUNICACION',   label: '📢 Comunicación'   },
];

const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre:   '',
    email:    '',
    password: '',
    area:     '',
  });
  const [error, setError]       = useState('');
  const [exito, setExito]       = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.area) { setError('Selecciona un área'); return; }
    setCargando(true);
    setError('');

    try {
      const data = await authService.register(form);
      setExito(data.mensaje);
      // No redirigimos inmediatamente para que lea el mensaje de verificación
      setTimeout(() => {
        if (window.confirm('¿Quieres ir al login ahora? (Recuerda verificar tu correo antes)')) {
          navigate('/login');
        }
      }, 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: '#ffffff',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', background: 'var(--color-primary)',
            borderRadius: '14px', marginBottom: '1rem', fontSize: '1.5rem',
          }}>
            🏢
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '700' }}>Crear cuenta</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
            Únete al equipo del CRM
          </p>
        </div>

        {/* Tarjeta */}
        <div className="card" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

            {error && <div className="alert-error">{error}</div>}
            {exito && (
              <div style={{
                padding: '0.65rem 1rem',
                background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.3)',
                borderRadius: '0.5rem',
                color: 'var(--color-success)',
                fontSize: '0.875rem',
              }}>
                {exito}
              </div>
            )}

            {/* Nombre */}
            <div className="form-group">
              <label className="form-label" htmlFor="nombre">Nombre completo</label>
              <input
                id="nombre" name="nombre" type="text"
                required placeholder="María García"
                className="form-input"
                value={form.nombre} onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Correo electrónico</label>
              <input
                id="reg-email" name="email" type="email"
                required placeholder="maria@empresa.com"
                className="form-input"
                value={form.email} onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Contraseña segura</label>
              <input
                id="reg-password" name="password" type="password"
                required minLength={8} placeholder="Crea una contraseña fuerte"
                className="form-input"
                value={form.password} onChange={handleChange}
              />
              <div style={{ 
                marginTop: '0.65rem', padding: '0.75rem', 
                background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem',
                fontSize: '0.75rem', color: 'var(--color-text-muted)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <p style={{ marginBottom: '0.35rem', fontWeight: '700', color: 'var(--color-primary)' }}>Protocolo de Seguridad:</p>
                <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <li>🛡️ Mínimo 8 caracteres</li>
                  <li>🔠 Incluir Mayúsculas y Minúsculas</li>
                  <li>🔢 Al menos un número</li>
                  <li>✨ Al menos un símbolo (!@#$...)</li>
                </ul>
              </div>
            </div>

            {/* Área — ancho completo */}
            <div className="form-group">
              <label className="form-label" htmlFor="area">Área de trabajo</label>
              <select
                id="area" name="area"
                className="form-input form-select"
                value={form.area} onChange={handleChange}
                required
              >
                <option value="">Seleccionar área...</option>
                {AREAS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Nota informativa sobre el rol */}
            <div style={{
              padding: '0.6rem 0.85rem',
              background: 'rgba(129,140,248,0.08)',
              border: '1px solid rgba(129,140,248,0.2)',
              borderRadius: '0.5rem',
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span>ℹ️</span>
              <span>Tu cuenta será creada como <strong style={{ color: '#ffffff' }}>Miembro</strong>. Solo el administrador puede asignar roles.</span>
            </div>

            <button type="submit" className="btn-primary" disabled={cargando} style={{ marginTop: '0.25rem' }}>
              {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '500', textDecoration: 'none' }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
