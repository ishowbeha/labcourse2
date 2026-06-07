import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar as BSNavbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const navLinks = (
    <>
      <Nav.Link as={Link} to="/home">Home</Nav.Link>
      <Nav.Link as={Link} to="/matches">Matches</Nav.Link>
      <Nav.Link as={Link} to="/tickets">Tickets</Nav.Link>
      <Nav.Link as={Link} to="/stadiums">Stadiums</Nav.Link>
      <Nav.Link as={Link} to="/favorites">⭐ Favorites</Nav.Link>
      <Nav.Link as={Link} to="/reviews">⭐ My Reviews</Nav.Link>
      <Nav.Link as={Link} to="/orders">My Orders</Nav.Link>
      <Nav.Link as={Link} to="/chat">💬 Chat</Nav.Link>
      {isAdmin() && (
        <Nav.Link as={Link} to="/admin/dashboard" className="text-warning fw-bold">
          Admin
        </Nav.Link>
      )}
    </>
  );

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" sticky="top" className="shadow-sm">
      <Container>
        <BSNavbar.Brand as={Link} to="/home">🏟️ Stadium Tickets</BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="main-navbar" />
        <BSNavbar.Collapse id="main-navbar">
          <Nav className="me-auto">{navLinks}</Nav>
          <Nav className="align-items-lg-center gap-lg-2">
            <NotificationBell />
            <Nav.Link as={Link} to="/profile" className="bg-white bg-opacity-10 rounded px-3">
              👤 Profile
            </Nav.Link>
            <Button variant="outline-light" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
