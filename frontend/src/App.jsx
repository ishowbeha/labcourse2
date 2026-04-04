import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route component - redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin Route component - redirects to home if not admin
const AdminRoute = ({ children }) => {
  const { isAdmin, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

// Public Route component - redirects to appropriate page if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    if (isAdmin()) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />

      {/* Protected user routes */}
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } 
      />

      {/* Admin routes */}
      <Route 
        path="/admin/dashboard" 
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } 
      />

      {/* Admin sub-pages (placeholders) */}
      <Route 
        path="/admin/users" 
        element={
          <AdminRoute>
            <AdminPlaceholder title="User Management" />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/stadiums" 
        element={
          <AdminRoute>
            <AdminPlaceholder title="Stadium Management" />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/matches" 
        element={
          <AdminRoute>
            <AdminPlaceholder title="Match Management" />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/tickets" 
        element={
          <AdminRoute>
            <AdminPlaceholder title="Ticket Management" />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/orders" 
        element={
          <AdminRoute>
            <AdminPlaceholder title="Order Management" />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/payments" 
        element={
          <AdminRoute>
            <AdminPlaceholder title="Payment Management" />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/reports" 
        element={
          <AdminRoute>
            <AdminPlaceholder title="Reports & Analytics" />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin/settings" 
        element={
          <AdminRoute>
            <AdminPlaceholder title="System Settings" />
          </AdminRoute>
        } 
      />

      {/* User pages */}
      <Route 
        path="/matches" 
        element={
          <ProtectedRoute>
            <UserPage title="⚽ Match Management" description="Browse and manage football matches." />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tickets" 
        element={
          <ProtectedRoute>
            <UserPage title="🎫 Ticket Management" description="Purchase, view, and manage your stadium tickets." />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/stadiums" 
        element={
          <ProtectedRoute>
            <UserPage title="🏟️ Stadium Management" description="View stadium information and seating charts." />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/orders" 
        element={
          <ProtectedRoute>
            <UserPage title="📋 My Orders" description="View your ticket order history." />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute>
            <UserPage title="👥 User Management" description="Manage user accounts and roles." />
          </ProtectedRoute>
        } 
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// Placeholder component for admin pages
const AdminPlaceholder = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={adminStyles.container}>
      <header style={adminStyles.header}>
        <div style={adminStyles.headerContent}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>{title}</h1>
          <div style={adminStyles.userInfo}>
            <span>{user?.first_name} {user?.last_name}</span>
            <button onClick={handleLogout} style={adminStyles.logoutBtn}>Logout</button>
          </div>
        </div>
      </header>
      <main style={adminStyles.main}>
        <div style={adminStyles.placeholder}>
          <p style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</p>
          <h2>{title}</h2>
          <p>This page is under development.</p>
        </div>
      </main>
    </div>
  );
};

// Simple user page component
const UserPage = ({ title, description }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={userPageStyles.container}>
      <nav style={navStyle}>
        <div style={navContentStyle}>
          <span style={navTitleStyle}>🏟️ Stadium Tickets</span>
          <div style={navRightStyle}>
            <a href="/home" style={navLinkStyle}>Home</a>
            <a href="/matches" style={navLinkStyle}>Matches</a>
            <a href="/tickets" style={navLinkStyle}>Tickets</a>
            <a href="/stadiums" style={navLinkStyle}>Stadiums</a>
            <a href="/orders" style={navLinkStyle}>My Orders</a>
            <span style={userNameStyle}>{user?.first_name}</span>
            <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
          </div>
        </div>
      </nav>
      <div style={contentStyle}>
        <h1>{title}</h1>
        <p>{description}</p>
        <div style={placeholderStyle}>
          <p>Page content coming soon...</p>
        </div>
      </div>
    </div>
  );
};

const navStyle = {
  backgroundColor: '#2c3e50',
  padding: '15px 0',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
};

const navContentStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const navTitleStyle = {
  color: 'white',
  fontSize: '20px',
  fontWeight: 'bold',
  textDecoration: 'none',
};

const navRightStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
};

const navLinkStyle = {
  color: 'white',
  textDecoration: 'none',
  fontSize: '14px',
};

const userNameStyle = {
  color: '#bdc3c7',
  fontSize: '14px',
};

const logoutBtnStyle = {
  backgroundColor: 'transparent',
  border: '1px solid white',
  color: 'white',
  padding: '6px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};

const userPageStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
};

const contentStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '40px 20px',
};

const placeholderStyle = {
  marginTop: '40px',
  padding: '60px',
  backgroundColor: 'white',
  borderRadius: '12px',
  textAlign: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
};

const adminStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid white',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  placeholder: {
    backgroundColor: 'white',
    padding: '80px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;