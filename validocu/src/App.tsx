import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

import Home from './pages/main/Home';
import Grupo from './pages/doc_rev/Grupo';

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/grupos/:grupoId" element={<Grupo />} />
          </Routes>
        </MainLayout>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
