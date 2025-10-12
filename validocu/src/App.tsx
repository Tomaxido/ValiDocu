import { Routes, Route } from 'react-router-dom';
import { configureEcho } from '@laravel/echo-react';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import MainLayout from './layouts/MainLayout';
import Home from './pages/main/Home';
import Grupo from './pages/doc_rev/Grupo';
import AccessRequestsPage from './pages/admin/AccessRequestsPage';
import NotificationCenter from './pages/test_notify/NotificationCenter';

configureEcho({
  broadcaster: 'reverb', // o 'reverb', pero internamente usa pusher-js
  key: import.meta.env.VITE_REVERB_APP_KEY || 'local', // Usa tu clave Reverb o un string cualquiera
  wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
  wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
  forceTLS: false,
  disableStats: true,
  encrypted: false,
});

export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/grupos/:grupoId" element={<Grupo />} />
            <Route 
              path="/admin/access-requests" 
              element={
                <AdminRoute>
                  <AccessRequestsPage />
                </AdminRoute>
              } 
            />
            <Route path="/notifications" element={<NotificationCenter />} />
          </Routes>
        </MainLayout>
      </ProtectedRoute>
    </AuthProvider>
  );
}
