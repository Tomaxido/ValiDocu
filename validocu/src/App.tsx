import { Routes, Route } from 'react-router-dom';
import { configureEcho, useEchoPublic } from '@laravel/echo-react';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import MainLayout from './layouts/MainLayout';
import Home from './pages/main/Home';
import Grupo from './pages/doc_rev/Grupo';
import AccessRequestsPage from './pages/admin/AccessRequestsPage';
import { type ProcessedDocumentEvent } from './utils/interfaces';
import { useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

configureEcho({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: Number(import.meta.env.VITE_REVERB_PORT),
  forceTLS: false,
  disableStats: true,
  encrypted: false,
});

export default function App() {
  const [open, setOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<ProcessedDocumentEvent | null>(null);
  
  // TODO: usar useEcho y averiguar cómo usar canales privados
  useEchoPublic<ProcessedDocumentEvent>('documents', 'DocumentsProcessed', event => {
    setOpen(true);
    setCurrentEvent(event);
  });

  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainLayout>
          <Snackbar
            open={open}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            autoHideDuration={10000}
            onClose={() => setOpen(false)}
          >
            <Alert
              severity="info"
              variant="filled"
            >
              Documentos analizados en el grupo {currentEvent?.groupId}.
            </Alert>
          </Snackbar>

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
          </Routes>
        </MainLayout>
      </ProtectedRoute>
    </AuthProvider>
  );
}
