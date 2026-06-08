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

  // Sporty accent palette — controlled, not rainbow
  const accentColors = {
    green:  '#00e676',
    orange: '#ff6b35',
    cyan:   '#00b4d8',
    amber:  '#ffd166',
    slate:  '#64748b',
  };

  const dashboardItems = [
    { title: '👥 User Management',      description: 'Manage user accounts and roles',        link: '/admin/users',     accent: accentColors.cyan   },
    { title: '🏟️ Stadium Management',   description: 'Manage stadiums and sections',           link: '/admin/stadiums',  accent: accentColors.green  },
    { title: '⚽ Match Management',      description: 'Schedule and manage matches',            link: '/admin/matches',   accent: accentColors.orange },
    { title: '🎫 Ticket Management',    description: 'View and manage all tickets',            link: '/admin/tickets',   accent: accentColors.amber  },
    { title: '📋 Order Management',     description: 'View and process orders',               link: '/admin/orders',    accent: accentColors.cyan   },
    { title: '💳 Payment Management',   description: 'Track payments and refunds',            link: '/admin/payments',  accent: accentColors.green  },
    { title: '🎟️ Coupon Management',    description: 'Manage discount coupons',               link: '/admin/coupons',   accent: accentColors.amber  },
    { title: '⭐ Reviews Management',   description: 'Approve and manage user reviews',       link: '/admin/reviews',   accent: accentColors.orange },
    { title: '📊 Reports & Analytics',  description: 'View sales and attendance reports',     link: '/admin/reports',   accent: accentColors.cyan   },
    { title: '⚙️ System Settings',      description: 'Configure system preferences',          link: '/admin/settings',  accent: accentColors.slate  },
  ];

  const statCards = [
    { value: formatNumber(stats?.totalUsers),             label: 'Registered Users',   accent: accentColors.cyan   },
    { value: formatNumber(stats?.totalMatches),           label: 'Active Matches',     accent: accentColors.orange },
    { value: formatNumber(stats?.totalTicketsSold || 0),  label: 'Tickets Sold',       accent: accentColors.green  },
    { value: formatNumber(ticketsAvailable),              label: 'Tickets Available',  accent: accentColors.amber  },
    { value: formatCurrency(stats?.totalRevenue || 0),    label: 'Total Revenue',      accent: accentColors.green  },
    { value: formatNumber(stats?.recentOrders || 0),      label: 'Total Orders',       accent: accentColors.cyan   },
  ];

  if (loading) {
    return (
      <div className="admin-sport-bg d-flex flex-column align-items-center justify-content-center gap-3" style={{ minHeight: '100vh' }}>
        <div style={{ width: 42, height: 42, border: '3px solid #1c2030', borderTop: '3px solid #00e676', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem', letterSpacing: '0.05em' }}>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="admin-sport-bg">
      <LazyAdminNavbar title="🏟️ Admin Dashboard" subtitle={`Welcome back, ${user?.first_name || 'Admin'}!`} backTo={false} />

      <Container className="py-4">
        {error && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            {error}
            <Button variant="danger" size="sm" onClick={fetchDashboardStats}>Retry</Button>
          </Alert>
        )}

        {/* ── Stat cards ── */}
        <Row className="g-3 mb-4">
          {statCards.map((stat, index) => (
            <Col key={index} xs={12} md={6} lg={4}>
              <div className="admin-stat-card shadow p-4 h-100">
                <div className="stat-accent-bar" style={{ background: stat.accent }} />
                <div style={{ color: stat.accent, fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                  {stat.value}
                </div>
                <div className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* ── Management section ── */}
        <p className="admin-section-title mb-3">⚡ Management</p>

        <Row className="g-3">
          {dashboardItems.map((item, index) => (
            <Col key={index} xs={12} sm={6} lg={3}>
              <Link to={item.link} className="text-decoration-none d-block h-100">
                <div className="admin-nav-card h-100 p-3">
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: item.accent, borderRadius: '12px 12px 0 0' }} />
                  <div className="card-icon mb-2">{item.title.split(' ')[0]}</div>
                  <div className="text-dark" style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>
                    {item.title.slice(item.title.indexOf(' ') + 1)}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.76rem', lineHeight: 1.4 }}>
                    {item.description}
                  </div>
                </div>
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
