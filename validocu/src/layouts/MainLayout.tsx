import type { ReactNode } from 'react';
import logo from "../assets/ValiDocu_1.png";
import './MainLayout.css';

interface Props {
  children: ReactNode;
}

export default function MainLayout({ children }: Props) {
  return (
    <div className="layout-wrapper">
      <header className="layout-header">
        <a href="/" className="logo-link">
          <img src={logo} alt="Logo" className="logo" />
        </a>


        <nav className="layout-nav">
          <a href="/">Inicio</a>
          <a href="/">Documentos</a>
          <a href="/">Perfil</a>
        </nav>
      </header>

      <main className="layout-content">
        {children}
      </main>
    </div>
  );
}