import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { useToast } from '../context/ToastContext';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const data = await authService.forgotPassword(email);
      showToast(data.mensaje, 'success');
      setEnviado(true);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #1e1b4b, #020617)', padding: '1.5rem'
    }}>
      <div style={{ 
        width: '100%', maxWidth: '400px', background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1.5rem', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        animation: 'fadeSlideIn 0.5s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', height: '60px', background: 'var(--color-primary)', 
            borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', margin: '0 auto 1rem', boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>🔑</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#fff' }}>¿Olvidaste tu clave?</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            No te preocupes, te enviaremos un enlace para restablecerla.
          </p>
        </div>

        {enviado ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '1rem', color: '#34d399', marginBottom: '1.5rem' }}>
              Petición procesada. Revisa tu bandeja de entrada (o la consola del servidor en este demo).
            </div>
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none' }}>
              ← Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input 
                type="email" className="form-input" placeholder="ejemplo@test.com" required
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={enviando} className="btn-primary" style={{ padding: '0.875rem' }}>
              {enviando ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
                Volver al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
