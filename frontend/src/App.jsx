// App.jsx - Router principal de la aplicacion
// Define todas las rutas y envuelve con el contexto de autenticacion

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ToastProvider } from './context/ToastContext';
import RutaProtegida from './components/RutaProtegida';
import Layout from './components/Layout';
import { TooltipProvider } from './components/ui/tooltip';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyAccountPage from './pages/VerifyAccountPage';
import { AuthSkeleton, PageSkeleton } from './components/Skeleton';

const lazyRetry = (importer, key) => lazy(async () => {
  const storageKey = `crm_lazy_retry_${key}`;

  try {
    const module = await importer();
    sessionStorage.removeItem(storageKey);
    return module;
  } catch (error) {
    const yaRecargo = sessionStorage.getItem(storageKey) === '1';
    const esChunkStale = error?.name === 'ChunkLoadError'
      || /Failed to fetch dynamically imported module/i.test(error?.message || '')
      || /Importing a module script failed/i.test(error?.message || '');

    if (esChunkStale && !yaRecargo) {
      sessionStorage.setItem(storageKey, '1');
      window.location.reload();
      return new Promise(() => {});
    }

    sessionStorage.removeItem(storageKey);
    throw error;
  }
});

const InvitationPage = lazyRetry(() => import('./pages/InvitationPage'), 'invitation');
const DashboardPage = lazyRetry(() => import('./pages/DashboardPage'), 'dashboard');
const ProyectosPage = lazyRetry(() => import('./pages/ProyectosPage'), 'proyectos');
const ProyectoDetallePage = lazyRetry(() => import('./pages/ProyectoDetallePage'), 'proyecto_detalle');
const UsuariosPage = lazyRetry(() => import('./pages/UsuariosPage'), 'usuarios');
const AgendaPage = lazyRetry(() => import('./pages/AgendaPage'), 'agenda');
const PerfilPage = lazyRetry(() => import('./pages/PerfilPage'), 'perfil');

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
          {/* Cache compartido de datos. Sin esto cada pantalla volvia a pedir
              todo desde cero al entrar, aunque ya hubieras estado ahi hace un
              momento, y se quedaba en el esqueleto de carga.

              - keepPreviousData: al volver, se pinta al instante lo que ya se
                tenia y la actualizacion llega despues, sin pantalla en blanco.
              - dedupingInterval: dos peticiones iguales seguidas cuentan como
                una sola durante 30 segundos.
              - revalidateOnFocus en false: cambiar de pestaña del navegador no
                dispara una recarga; en un CRM interno molesta mas que ayuda. */}
          <SWRConfig
            value={{
              keepPreviousData: true,
              dedupingInterval: 30000,
              revalidateOnFocus: false,
              revalidateIfStale: true,
              errorRetryCount: 2,
            }}
          >
            {/* Requerido por los Tooltip de shadcn/Radix en toda la app */}
            <TooltipProvider delayDuration={200}>
              <AppRoutes />
            </TooltipProvider>
          </SWRConfig>
        </ToastProvider>
      </AuthProvider>
    </PreferencesProvider>
  </BrowserRouter>
);

export default App;
