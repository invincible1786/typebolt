import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Terminal, BarChart2, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/test" className="navbar-brand">
          <Zap className="brand-icon" size={20} />
          <span>TypeBolt</span>
        </Link>
        <div className="navbar-menu">
          <Link
            to="/test"
            className={`navbar-link ${location.pathname === '/test' ? 'active' : ''}`}
          >
            <Terminal size={16} />
            <span>Typing Test</span>
          </Link>
          <Link
            to="/dashboard"
            className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            <BarChart2 size={16} />
            <span>Dashboard</span>
          </Link>
        </div>
        <div className="navbar-user">
          {user && (
            <div className="user-badge">
              <User size={14} className="user-icon" />
              <span className="username">{user.username}</span>
            </div>
          )}
          <button onClick={logout} className="logout-btn" title="Log out">
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;