// App.jsx - Router principal de la aplicacion
// Define todas las rutas y envuelve con el contexto de autenticacion

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ToastProvider } from './context/ToastContext';
import RutaProtegida from './components/RutaProtegida';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyAccountPage from './pages/VerifyAccountPage';
import { AuthSkeleton, PageSkeleton } from './components/Skeleton';

const InvitationPage = lazy(() => import('./pages/InvitationPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProyectosPage = lazy(() => import('./pages/ProyectosPage'));
const ProyectoDetallePage = lazy(() => import('./pages/ProyectoDetallePage'));
const EquipoPage = lazy(() => import('./pages/EquipoPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const PerfilPage = lazy(() => import('./pages/PerfilPage'));

// Redirige al dashboard si ya hay sesion activa (evita volver al login)
const RutaPublica = ({ children }) => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <AuthSkeleton compact />;
  return usuario ? <Navigate to="/dashboard" replace /> : children;
};

const RoutePageFallback = () => <PageSkeleton cards={4} />;

const PublicLazyRoute = ({ children, compact = false }) => (
  <Suspense fallback={<AuthSkeleton compact={compact} />}>
    {children}
  </Suspense>
);

const PrivateLazyRoute = ({ children }) => (
  <Suspense fallback={<RoutePageFallback />}>
    {children}
  </Suspense>
);

// Wrapper que aplica el Layout a las rutas privadas
const RutaConLayout = ({ children }) => (
  <RutaProtegida>
    <Layout>
      <PrivateLazyRoute>{children}</PrivateLazyRoute>
    </Layout>
  </RutaProtegida>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />

    <Route path="/login" element={<RutaPublica><LoginPage /></RutaPublica>} />
    <Route path="/invitacion/:token" element={<PublicLazyRoute><InvitationPage /></PublicLazyRoute>} />
    <Route path="/forgot-password" element={<RutaPublica><ForgotPasswordPage /></RutaPublica>} />
    <Route path="/reset-password/:token" element={<RutaPublica><ResetPasswordPage /></RutaPublica>} />
    <Route path="/verify/:token" element={<VerifyAccountPage />} />

    <Route path="/dashboard" element={<RutaConLayout><DashboardPage /></RutaConLayout>} />
    <Route path="/proyectos" element={<RutaConLayout><ProyectosPage /></RutaConLayout>} />
    <Route path="/proyectos/:id" element={<RutaConLayout><ProyectoDetallePage /></RutaConLayout>} />
    <Route path="/equipo" element={<RutaConLayout><EquipoPage /></RutaConLayout>} />
    <Route path="/usuarios" element={<RutaConLayout><UsuariosPage /></RutaConLayout>} />
    <Route path="/agenda" element={<RutaConLayout><AgendaPage /></RutaConLayout>} />
    <Route path="/perfil" element={<RutaConLayout><PerfilPage /></RutaConLayout>} />

    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <PreferencesProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </PreferencesProvider>
  </BrowserRouter>
);

export default App;
