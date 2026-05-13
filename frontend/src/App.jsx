// App.jsx — Router principal de la aplicación
// Define todas las rutas y envuelve con el contexto de autenticación

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import RutaProtegida  from './components/RutaProtegida';
import Layout         from './components/Layout';
import LoginPage      from './pages/LoginPage';
import InvitationPage from './pages/InvitationPage';
import DashboardPage  from './pages/DashboardPage';
import ProyectosPage         from './pages/ProyectosPage';
import ProyectoDetallePage   from './pages/ProyectoDetallePage';
import EquipoPage            from './pages/EquipoPage';
import UsuariosPage          from './pages/UsuariosPage';
import ForgotPasswordPage    from './pages/ForgotPasswordPage';
import ResetPasswordPage     from './pages/ResetPasswordPage';
import VerifyAccountPage     from './pages/VerifyAccountPage';
import AgendaPage            from './pages/AgendaPage';

// Redirige al dashboard si ya hay sesión activa (evita volver al login)
const RutaPublica = ({ children }) => {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  return usuario ? <Navigate to="/dashboard" replace /> : children;
};

// Wrapper que aplica el Layout a las rutas privadas
const RutaConLayout = ({ children }) => (
  <RutaProtegida>
    <Layout>{children}</Layout>
  </RutaProtegida>
);

const AppRoutes = () => (
  <Routes>
    {/* Ruta raíz → dashboard (si hay sesión) o login */}
    <Route path="/" element={<Navigate to="/dashboard" replace />} />

    {/* Rutas públicas */}
    <Route path="/login"    element={<RutaPublica><LoginPage /></RutaPublica>} />
    <Route path="/invitacion/:token" element={<InvitationPage />} />
    <Route path="/forgot-password" element={<RutaPublica><ForgotPasswordPage /></RutaPublica>} />
    <Route path="/reset-password/:token" element={<RutaPublica><ResetPasswordPage /></RutaPublica>} />
    <Route path="/verify/:token" element={<VerifyAccountPage />} />

    {/* Rutas protegidas con Layout (sidebar) */}
    <Route path="/dashboard" element={<RutaConLayout><DashboardPage /></RutaConLayout>} />
    <Route path="/proyectos"    element={<RutaConLayout><ProyectosPage /></RutaConLayout>} />
    <Route path="/proyectos/:id" element={<RutaConLayout><ProyectoDetallePage /></RutaConLayout>} />
    <Route path="/equipo"    element={<RutaConLayout><EquipoPage /></RutaConLayout>} />
    <Route path="/usuarios"  element={<RutaConLayout><UsuariosPage /></RutaConLayout>} />
    <Route path="/agenda"    element={<RutaConLayout><AgendaPage /></RutaConLayout>} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
