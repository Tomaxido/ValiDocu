import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './UserMenu.css';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  if (!user) return null;

  return (
    <div className="user-menu">
      <button className="user-menu-button" onClick={toggleMenu}>
        <div className="user-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="user-name">{user.name}</span>
        <svg
          className={`chevron ${isMenuOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>

      {isMenuOpen && (
        <>
          <div className="menu-overlay" onClick={closeMenu} />
          <div className="user-menu-dropdown">
            <div className="user-info">
              <div className="user-details">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <hr className="menu-divider" />
            <button className="menu-item logout-item" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;