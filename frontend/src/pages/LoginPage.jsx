// Página de Login
// Formulario de email/password — guarda el JWT y redirige al dashboard

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

const LoginPage = () => {
  const navigate       = useNavigate();
  const { login }      = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [cargando, setCargando] = useState(false);

  // Actualizar campo del formulario
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(''); // Limpiar error al escribir
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const data = await authService.login(form.email, form.password);
      login(data.token, data.usuario); // Guardar en contexto y localStorage
      navigate('/dashboard');
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

        {/* Logo / Título */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px', height: '64px',
            marginBottom: '1rem',
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--color-text)' }}>
            Panel Interno
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
            Inicia sesión para continuar
          </p>
        </div>

        {/* Tarjeta del formulario */}
        <div className="card" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Error global */}
            {error && <div className="alert-error">{error}</div>}

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@empresa.com"
                className="form-input"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Contraseña</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="form-input"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={cargando}
              style={{ marginTop: '0.5rem' }}
            >
              {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: '500', textDecoration: 'none' }}>
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
