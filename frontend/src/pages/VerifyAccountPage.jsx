import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import Spinner from '../components/Spinner';
import { CheckCircle2, XCircle } from 'lucide-react';

const VerifyAccountPage = () => {
  const { token } = useParams();
  const [estado, setEstado] = useState('verificando'); // verificando, exito, error
  const [mensaje, setMensaje] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const verificar = async () => {
      try {
        const data = await authService.verifyAccount(token);
        setEstado('exito');
        setMensaje(data.mensaje);
        
        // Redirigir al login tras 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        setEstado('error');
        setMensaje(error.message);
      }
    };
    verificar();
  }, [token, navigate]);

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#ffffff', padding: '1.5rem'
    }}>
      <div style={{ 
        width: '100%', maxWidth: '450px', background: '#ffffff',
        border: '1px solid var(--color-border)',
        borderRadius: '1.5rem', padding: '3rem', textAlign: 'center',
        boxShadow: 'var(--shadow-xl)'
      }}>
        {estado === 'verificando' && (
          <>
            <Spinner texto="Verificando tu cuenta..." />
            <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem' }}>Estamos validando tu enlace...</p>
          </>
        )}

        {estado === 'exito' && (
          <div style={{ animation: 'fadeSlideIn 0.4s ease' }}>
            }}>
              <CheckCircle2 size={40} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--color-text)', marginBottom: '1rem' }}>¡Cuenta Verificada!</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
              {mensaje}<br/>
              <span style={{ fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>Redirigiendo al login en 3 segundos...</span>
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.8rem 2rem' }}>
              Ir al Login
            </Link>
          </div>
        )}

        {estado === 'error' && (
          <div style={{ animation: 'fadeSlideIn 0.4s ease' }}>
            }}>
              <XCircle size={40} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--color-text)', marginBottom: '1rem' }}>Error de Verificación</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>{mensaje}</p>
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none' }}>
              Intentar registrarse de nuevo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyAccountPage;
