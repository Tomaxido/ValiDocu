import type { ReactNode } from 'react';
import './MainLayout.css';

interface Props {
  children: ReactNode;
}

export default function MainLayout({ children }: Props) {
  return (
    <div className="layout-wrapper">
      <header className="layout-header">
        <div className="logo">📄 ValiDocu</div>

        <nav className="layout-nav">
          <a href="#">Inicio</a>
          <a href="#">Documentos</a>
          <a href="#">Perfil</a>
        </nav>
      </header>

      <main className="layout-content">
        {children}
      </main>
    </div>
  );
}