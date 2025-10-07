import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import MainLayout from './layouts/MainLayout';

import Home from './pages/main/Home';
import Grupo from './pages/doc_rev/Grupo';
import AccessRequestsPage from './pages/admin/AccessRequestsPage';

function App() {
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
          </Routes>
        </MainLayout>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
