import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Button, Offcanvas, Navbar as BSNavbar } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

export default function AdminNavbar({
  title,
  subtitle,
  backTo = '/admin/dashboard',
  backLabel = 'Dashboard',
  actions,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="admin-header text-white sticky-top shadow">
      <Container fluid="lg" className="py-3">
        <div className="d-flex justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
            <Link
              to="/home"
              className="btn btn-sm btn-outline-success rounded-pill text-nowrap flex-shrink-0"
            >
              🏠 Home Site
            </Link>

            {backTo !== false && (
              <Link
                to={backTo}
                className="btn btn-sm btn-outline-light text-nowrap flex-shrink-0"
              >
                ← {backLabel}
              </Link>
            )}

            <div className="min-w-0 overflow-hidden">
              <h1 className="h5 mb-0 fw-bold text-truncate">{title}</h1>
              {subtitle && <p className="mb-0 small text-secondary text-truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            {actions && <div className="d-flex align-items-center gap-2">{actions}</div>}

            <div className="d-none d-lg-flex align-items-center gap-3">
              <div className="text-end">
                <div className="small fw-semibold">{user?.first_name} {user?.last_name}</div>
                <div className="text-primary small fw-bold" style={{ letterSpacing: '0.8px', fontSize: '10px' }}>
                  ADMINISTRATOR
                </div>
              </div>
              <Button variant="outline-light" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            <Button
              variant="outline-light"
              className="d-lg-none border-0 p-1"
              onClick={() => setMenuOpen(true)}
              aria-label="Toggle menu"
            >
              <span className="navbar-toggler-icon" />
            </Button>
          </div>
        </div>
      </Container>

      <Offcanvas show={menuOpen} onHide={() => setMenuOpen(false)} placement="end" className="bg-dark text-white">
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title className="small">Admin Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary">
            <div>
              <div className="fw-semibold">{user?.first_name} {user?.last_name}</div>
              <div className="text-primary small fw-bold">ADMINISTRATOR</div>
            </div>
            <Button variant="outline-light" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>

          <nav className="d-flex flex-column gap-2">
            <Link
              to="/home"
              onClick={() => setMenuOpen(false)}
              className="text-decoration-none text-success fw-bold p-2 rounded border-start border-success border-3"
            >
              🏠 Home Site
            </Link>
            {backTo !== false && (
              <Link
                to={backTo}
                onClick={() => setMenuOpen(false)}
                className="text-decoration-none text-white p-2 rounded border-start border-primary border-3"
              >
                ← {backLabel}
              </Link>
            )}
          </nav>
        </Offcanvas.Body>
      </Offcanvas>
    </header>
  );
}
