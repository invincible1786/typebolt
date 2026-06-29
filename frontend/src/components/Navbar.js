import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/test" className="navbar-brand">
          TypeBolt
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
          {user && <span className="username">Welcome, {user.username}!</span>}
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 