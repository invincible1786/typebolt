import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('typebolt_theme') || 'neon');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('typebolt_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'neon' ? 'cyber' : 'neon'));
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/test" className="navbar-brand">
          ⚡ TypeBolt
        </Link>
        <div className="navbar-menu">
          <Link to="/test" className="navbar-link">
            Typing Test
          </Link>
          <Link to="/dashboard" className="navbar-link">
            Dashboard
          </Link>
        </div>
        <div className="navbar-user">
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title="Toggle Visual Theme"
          >
            {theme === 'neon' ? '⚡ Neon' : '🌐 Cyber'}
          </button>
          {user && <span className="username">👋 {user.username}</span>}
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 