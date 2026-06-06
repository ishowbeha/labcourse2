import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Lazy load all page components for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminStadiums = lazy(() => import('./pages/AdminStadiums'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminCoupons = lazy(() => import('./pages/AdminCoupons'));
const AdminReviews = lazy(() => import('./pages/AdminReviews'));
const AdminMatches = lazy(() => import('./pages/AdminMatches'));
const Matches = lazy(() => import('./pages/Matches'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Stadiums = lazy(() => import('./pages/Stadiums'));
const Orders = lazy(() => import('./pages/Orders'));
const Favorites = lazy(() => import('./pages/Favorites'));
const MyReviews = lazy(() => import('./pages/MyReviews'));
const MyProfile = lazy(() => import('./pages/MyProfile'));

// Loading fallback component
const PageLoader = () => (
  <div style={loadingStyles.container}>
    <div style={loadingStyles.spinner}></div>
    <p style={loadingStyles.text}>Loading...</p>
  </div>
);

// Custom hook for responsive styles
const useResponsiveStyles = () => {
  const [screenSize, setScreenSize] = useState('desktop');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setScreenSize('mobile');
      } else if (width <= 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

// Protected Route component - redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
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
    return <PageLoader />;
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
    return <PageLoader />;
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
    <Suspense fallback={<PageLoader />}>
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

        {/* My Profile route - accessible by all authenticated users */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <MyProfile />
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

        {/* Admin sub-pages */}
        <Route 
          path="/admin/users" 
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/stadiums" 
          element={
            <AdminRoute>
              <AdminStadiums />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/matches" 
          element={
            <AdminRoute>
              <AdminMatches />
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
              <AdminOrders />
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
          path="/admin/coupons"
          element={
            <AdminRoute>
              <AdminCoupons />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminRoute>
              <AdminReviews />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminRoute>
              <AdminReports />
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
              <Matches />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tickets" 
          element={
            <ProtectedRoute>
              <Tickets />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/stadiums" 
          element={
            <ProtectedRoute>
              <Stadiums />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews"
          element={
            <ProtectedRoute>
              <MyReviews />
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
    </Suspense>
  );
}

// Placeholder component for admin pages
const AdminPlaceholder = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentHeaderContentStyle = screenSize === 'mobile' 
    ? responsiveStyles.mobile.adminHeaderContent 
    : adminStyles.headerContent;
  
  const currentUserInfoStyle = screenSize === 'mobile' 
    ? responsiveStyles.mobile.adminUserInfo 
    : adminStyles.userInfo;
  
  const currentMainStyle = screenSize === 'mobile' 
    ? responsiveStyles.mobile.adminMain 
    : screenSize === 'tablet'
    ? responsiveStyles.tablet.adminMain
    : adminStyles.main;

  const currentPlaceholderStyle = screenSize === 'mobile' 
    ? responsiveStyles.mobile.adminPlaceholder 
    : adminStyles.placeholder;

  return (
    <div style={adminStyles.container}>
      <header style={adminStyles.header}>
        <div style={currentHeaderContentStyle}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>{title}</h1>
          <div style={currentUserInfoStyle}>
            <span>{user?.first_name} {user?.last_name}</span>
            <button onClick={handleLogout} style={adminStyles.logoutBtn}>Logout</button>
          </div>
        </div>
      </header>
      <main style={currentMainStyle}>
        <div style={currentPlaceholderStyle}>
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
  const screenSize = useResponsiveStyles();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentNavContentStyle = screenSize === 'mobile' 
    ? responsiveStyles.mobile.navContentStyle 
    : navContentStyle;
  
  const currentNavRightStyle = screenSize === 'mobile' 
    ? responsiveStyles.mobile.navRightStyle 
    : navRightStyle;
  
  const currentContentStyle = screenSize === 'mobile' 
    ? responsiveStyles.mobile.contentStyle 
    : screenSize === 'tablet'
    ? responsiveStyles.tablet.contentStyle
    : contentStyle;

  return (
    <div style={userPageStyles.container}>
      <nav style={navStyle}>
        <div style={currentNavContentStyle}>
          <span style={navTitleStyle}>🏟️ Stadium Tickets</span>
          <div style={currentNavRightStyle}>
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
      <div style={currentContentStyle}>
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

// Loading styles
const loadingStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  text: {
    color: '#7f8c8d',
    fontSize: '16px',
  },
};

// Responsive styles
const responsiveStyles = {
  // Mobile styles (max-width: 768px)
  mobile: {
    navContentStyle: {
      ...navContentStyle,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '10px',
    },
    navRightStyle: {
      ...navRightStyle,
      width: '100%',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    contentStyle: {
      ...contentStyle,
      padding: '20px 15px',
    },
    placeholderStyle: {
      ...placeholderStyle,
      padding: '40px 20px',
    },
    adminHeaderContent: {
      ...adminStyles.headerContent,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '15px',
    },
    adminUserInfo: {
      ...adminStyles.userInfo,
      width: '100%',
      justifyContent: 'space-between',
    },
    adminMain: {
      ...adminStyles.main,
      padding: '20px 15px',
    },
    adminPlaceholder: {
      ...adminStyles.placeholder,
      padding: '40px 20px',
    },
  },
  
  // Tablet styles (max-width: 1024px)
  tablet: {
    navContentStyle: {
      ...navContentStyle,
      padding: '0 15px',
    },
    contentStyle: {
      ...contentStyle,
      padding: '30px 15px',
    },
    adminHeaderContent: {
      ...adminStyles.headerContent,
      padding: '0 15px',
    },
    adminMain: {
      ...adminStyles.main,
      padding: '30px 15px',
    },
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;