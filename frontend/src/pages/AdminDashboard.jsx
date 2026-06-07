import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import OrderService from '../services/OrderService';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';
import axios from 'axios';

const AdminDashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [localOrders, setLocalOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const local = OrderService.getOrders();
    setLocalOrders(local);
    fetchDashboardStats();
    fetchBackendOrders();
  }, []);

  const fetchBackendOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/orders?limit=1000', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      if (res.data?.success && res.data?.data?.orders) {
        const existing = OrderService.getOrders();
        const existingOrderNumbers = new Set(existing.map(o => o.orderNumber));
        const newOrders = res.data.data.orders
          .filter(o => !existingOrderNumbers.has(o.order_number))
          .map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            date: o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            match: o.match_name || 'Match',
            tickets: o.ticket_count || 1,
            total: parseFloat(o.total_amount) || 0,
            status: o.status || 'confirmed',
            paymentMethod: o.payment_method || 'Credit Card',
            fromBackend: true
          }));
        if (newOrders.length > 0) {
          setLocalOrders(prev => [...prev, ...newOrders]);
        }
      }
    } catch (e) {
      console.log('Backend orders fetch optional:', e.message);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (!isAdmin()) {
    navigate('/home');
    return null;
  }

  const ticketsAvailable = 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
  };

  const dashboardItems = [
    { title: '👥 User Management', description: 'Manage user accounts and roles', link: '/admin/users', borderClass: 'border-primary' },
    { title: '🏟️ Stadium Management', description: 'Manage stadiums and sections', link: '/admin/stadiums', borderClass: 'border-success' },
    { title: '⚽ Match Management', description: 'Schedule and manage matches', link: '/admin/matches', borderClass: 'border-danger' },
    { title: '🎫 Ticket Management', description: 'View and manage all tickets', link: '/admin/tickets', borderClass: 'border-info' },
    { title: '📋 Order Management', description: 'View and process orders', link: '/admin/orders', borderClass: 'border-warning' },
    { title: '💳 Payment Management', description: 'Track payments and refunds', link: '/admin/payments', borderClass: 'border-success' },
    { title: '🎫 Coupon Management', description: 'Manage discount coupons', link: '/admin/coupons', borderClass: 'border-warning' },
    { title: '⭐ Reviews Management', description: 'Approve and manage user reviews', link: '/admin/reviews', borderClass: 'border-info' },
    { title: '📊 Reports & Analytics', description: 'View sales and attendance reports', link: '/admin/reports', borderClass: 'border-warning' },
    { title: '⚙️ System Settings', description: 'Configure system preferences', link: '/admin/settings', borderClass: 'border-secondary' },
  ];

  const statCards = [
    { value: formatNumber(stats?.totalUsers), label: 'Registered Users', borderClass: 'border-primary' },
    { value: formatNumber(stats?.totalMatches), label: 'Active Matches', borderClass: 'border-success' },
    { value: formatNumber(stats?.totalTicketsSold || 0), label: 'Tickets Sold', borderClass: 'border-danger' },
    { value: formatNumber(ticketsAvailable), label: 'Tickets Available', borderClass: 'border-warning' },
    { value: formatCurrency(stats?.totalRevenue || 0), label: 'Total Revenue', borderClass: 'border-success' },
    { value: formatNumber(stats?.recentOrders || 0), label: 'Total Orders', borderClass: 'border-info' },
  ];

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex flex-column align-items-center justify-content-center gap-3">
        <Spinner animation="border" variant="primary" />
        <p className="text-muted mb-0">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="🏟️ Admin Dashboard" subtitle={`Welcome back, ${user?.first_name || 'Admin'}!`} backTo={false} />

      <Container className="py-4">
        {error && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            {error}
            <Button variant="danger" size="sm" onClick={fetchDashboardStats}>Retry</Button>
          </Alert>
        )}

        <Row className="g-3 mb-4">
          {statCards.map((stat, index) => (
            <Col key={index} xs={12} md={6} lg={4}>
              <Card className={`h-100 shadow-sm border-start border-4 ${stat.borderClass}`}>
                <Card.Body className="text-center">
                  <div className="fs-2 fw-bold text-dark">{stat.value}</div>
                  <div className="text-muted small">{stat.label}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <h2 className="h5 text-dark mb-3">Management</h2>

        <Row className="g-3">
          {dashboardItems.map((item, index) => (
            <Col key={index} xs={12} sm={6} lg={3}>
              <Link to={item.link} className="text-decoration-none">
                <Card className={`h-100 shadow-sm border-start border-4 ${item.borderClass}`}>
                  <Card.Body>
                    <Card.Title className="h6 text-dark">{item.title}</Card.Title>
                    <Card.Text className="text-muted small mb-0">{item.description}</Card.Text>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    available: '#2ecc71',
    reserved: '#f39c12',
    sold: '#e74c3c',
    cancelled: '#95a5a6'
  };
  return colors[status] || '#95a5a6';
};

export default AdminDashboard;
