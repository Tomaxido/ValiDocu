import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

import Home from './pages/main/Home';
import Grupo from './pages/doc_rev/Grupo';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
          <Route path="/grupos/:grupoId" element={<Grupo />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
