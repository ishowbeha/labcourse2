import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-content">
          <a href="/home" className="navbar-title">🏟️ Stadium Tickets</a>
          
          {/* Desktop Navigation */}
          <div className="desktop-nav">
            <div className="nav-links">
              <a href="/home" className="nav-link">Home</a>
              <a href="/matches" className="nav-link">Matches</a>
              <a href="/tickets" className="nav-link">Tickets</a>
              <a href="/stadiums" className="nav-link">Stadiums</a>
              <a href="/orders" className="nav-link">My Orders</a>
              {isAdmin() && (
                <a href="/admin/dashboard" className="nav-link admin-link">
                  Admin
                </a>
              )}
            </div>
            <div className="nav-actions">
              <NotificationBell />
              <span className="user-name">{user?.firstName || user?.first_name}</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          </div>

          {/* Hamburger Menu Button */}
          <button 
            className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`} 
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-overlay ${mobileMenuOpen ? 'show' : ''}`} onClick={closeMobileMenu}>
        <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-menu-header">
            <span className="mobile-user-name">{user?.firstName || user?.first_name}</span>
            <button onClick={handleLogout} className="mobile-logout-btn">Logout</button>
          </div>
          <nav className="mobile-nav">
            <a href="/home" className="mobile-nav-link" onClick={closeMobileMenu}>🏠 Home</a>
            <a href="/matches" className="mobile-nav-link" onClick={closeMobileMenu}>⚽ Matches</a>
            <a href="/tickets" className="mobile-nav-link" onClick={closeMobileMenu}>🎫 My Tickets</a>
            <a href="/stadiums" className="mobile-nav-link" onClick={closeMobileMenu}>🏟️ Stadiums</a>
            <a href="/orders" className="mobile-nav-link" onClick={closeMobileMenu}>📋 My Orders</a>
            {isAdmin() && (
              <a href="/admin/dashboard" className="mobile-nav-link admin-link" onClick={closeMobileMenu}>
                👑 Admin Dashboard
              </a>
            )}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Navbar;