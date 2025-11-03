import { Routes, Route } from 'react-router-dom';
import { configureEcho, useEchoPublic } from '@laravel/echo-react';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import MainLayout from './layouts/MainLayout';
import Home from './pages/main/Home';
import Grupo from './pages/doc_rev/Grupo';
import Documento from './pages/doc_rev/Documento';
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
  const [currentEvent, setCurrentEvent] = useState<ProcessedDocumentEvent | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);
  
  // TODO: usar useEcho y averiguar cómo usar canales privados
  useEchoPublic<ProcessedDocumentEvent>('documents', 'DocumentsProcessed', event => {
    if (event === null) return;
    setIsNotificationOpen(true);
    setCurrentEvent(event);
  });

  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainLayout currentEvent={currentEvent} isDocMenuOpen={isDocMenuOpen} setIsDocMenuOpen={setIsDocMenuOpen}>
          <Snackbar
            open={isNotificationOpen}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            onClose={() => setIsNotificationOpen(false)}
          >
            {currentEvent === null ? <Alert /> : <Alert
              severity={currentEvent.document.status === 2 ? "error" : "success"}
              variant="filled"
            >
              {currentEvent.document.status === 2
              ? `Error al analizar documento '${currentEvent.document.filename}'${currentEvent.group ? ` en grupo '${currentEvent.group.name}'.` : '.'}`
              : `Documento '${currentEvent.document.filename}' analizado exitosamente${currentEvent.group ? ` en grupo '${currentEvent.group.name}'.` : '.'}`
              }
            </Alert>
            }
            
          </Snackbar>

          <Routes>
            <Route path="/" element={<Home currentEvent={currentEvent} setIsDocMenuOpen={setIsDocMenuOpen} />} />
            <Route path="/grupos/:grupoId" element={<Grupo currentEvent={currentEvent} setIsDocMenuOpen={setIsDocMenuOpen} />} />
            <Route path="/documentos/:documentoId" element={<Documento />} />
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
