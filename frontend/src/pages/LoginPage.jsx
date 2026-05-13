// Página de Login
// Formulario de email/password — guarda el JWT y redirige al dashboard

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

const LoginPage = () => {
  const navigate       = useNavigate();
  const { login }      = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [verPassword, setVerPassword] = useState(false);
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
            width: '100%',
            maxWidth: '220px',
            height: 'auto',
            marginBottom: '1.5rem',
          }}>
            <img src="/logo_login.jpeg" alt="Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
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
            <div className="form-group" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Contraseña</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type={verPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '2.4rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.25rem'
                }}
              >
                {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
