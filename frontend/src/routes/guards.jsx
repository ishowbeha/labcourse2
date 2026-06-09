import { Navigate } from 'react-router-dom';
import { Container, Card } from 'react-bootstrap';
import { useAuth } from '../store/authStore';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';
import LazyNavbar from '../components/layout/LazyNavbar';
import PageLoader from '../components/PageLoader';

// Check if user is authenticated by verifying the isLoggedIn cookie exists.
// This is a non-httpOnly cookie set alongside the httpOnly refreshToken cookie.
// The access token can be deleted from DevTools, but the isLoggedIn cookie
// can only be deleted by clearing cookies, which also deletes refreshToken.
// If isLoggedIn exists, the api.js interceptor will auto-refresh the access token.
const isLoggedIn = () => document.cookie.includes('isLoggedIn=');

export const ProtectedRoute = ({ children }) => {
  const { loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
};

export const AdminRoute = ({ children }) => {
  const { loading, isAdmin } = useAuth();
  if (loading) return <PageLoader />;
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/home" replace />;
  return children;
};

export const PublicRoute = ({ children }) => {
  const { loading, isAdmin } = useAuth();
  if (loading) return <PageLoader />;
  if (isLoggedIn()) {
    if (isAdmin()) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/home" replace />;
  }
  return children;
};

export const AdminPlaceholder = ({ title }) => (
  <div className="min-vh-100 bg-light">
    <LazyAdminNavbar title={title} />
    <Container className="py-4 py-md-5">
      <Card className="text-center shadow-sm border-0 p-4 p-md-5">
        <p className="display-4 mb-3">🚧</p>
        <h2>{title}</h2>
        <p className="text-muted mb-0">This page is under development.</p>
      </Card>
    </Container>
  </div>
);

export const UserPage = ({ title, description }) => (
  <div className="min-vh-100 bg-light">
    <LazyNavbar />
    <Container className="py-4 py-md-5">
      <h1>{title}</h1>
      <p className="text-muted">{description}</p>
      <Card className="text-center shadow-sm border-0 p-5 mt-4">
        <p className="mb-0 text-muted">Page content coming soon...</p>
      </Card>
    </Container>
  </div>
);