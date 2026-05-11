// Componente de ruta protegida
// Redirige al login si no hay sesión activa

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RutaProtegida = ({ children }) => {
  const { usuario, cargando } = useAuth();

  // Mientras verifica el token, mostrar un spinner sutil
  if (cargando) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        color: 'var(--color-text-muted)',
        fontSize: '0.9rem',
      }}>
        Verificando sesión...
      </div>
    );
  }

  // Si no hay usuario autenticado → redirigir al login
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RutaProtegida;
