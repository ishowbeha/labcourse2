import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import OrderService from '../services/OrderService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';
import axios from 'axios';

const AdminDashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
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
        // Merge backend orders into local orders set
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

  // Merge local orders stats with DB stats - ONLY actual sales
  const localConfirmedOrders = localOrders.filter(o => o.status === 'confirmed' || o.status === 'completed');
  const localTicketsSold = localConfirmedOrders.reduce((sum, o) => sum + (o.tickets || 0), 0);
  const localRevenue = localConfirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalTicketsSold = localTicketsSold;
  const totalRevenue = localRevenue;
  const recentOrders = localConfirmedOrders.length;
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
    {
      title: '👥 User Management',
      description: 'Manage user accounts and roles',
      link: '/admin/users',
      color: '#3498db',
    },
    {
      title: '🏟️ Stadium Management',
      description: 'Manage stadiums and sections',
      link: '/admin/stadiums',
      color: '#2ecc71',
    },
    {
      title: '⚽ Match Management',
      description: 'Schedule and manage matches',
      link: '/admin/matches',
      color: '#e74c3c',
    },
    {
      title: '🎫 Ticket Management',
      description: 'View and manage all tickets',
      link: '/admin/tickets',
      color: '#9b59b6',
    },
    {
      title: '📋 Order Management',
      description: 'View and process orders',
      link: '/admin/orders',
      color: '#f39c12',
    },
    {
      title: '💳 Payment Management',
      description: 'Track payments and refunds',
      link: '/admin/payments',
      color: '#1abc9c',
    },
    {
      title: '🎫 Coupon Management',
      description: 'Manage discount coupons',
      link: '/admin/coupons',
      color: '#e67e22',
    },
    {
      title: '⭐ Reviews Management',
      description: 'Approve and manage user reviews',
      link: '/admin/reviews',
      color: '#9b59b6',
    },
    {
      title: '📊 Reports & Analytics',
      description: 'View sales and attendance reports',
      link: '/admin/reports',
      color: '#e67e22',
    },
    {
      title: '⚙️ System Settings',
      description: 'Configure system preferences',
      link: '/admin/settings',
      color: '#7f8c8d',
    },
  ];

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>🏟️ Admin Dashboard</h1>
            <p style={styles.welcome}>
              Welcome back, {user?.first_name || 'Admin'}!
            </p>
          </div>
          <div style={styles.userInfo}>
            <Link to="/home" style={styles.homeBtn}>🏠 Home</Link>
            <span style={styles.userName}>{user?.first_name} {user?.last_name}</span>
            <span style={styles.userRole}>Administrator</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
            <button 
              className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`} 
              onClick={toggleMobileMenu}
              style={screenSize === 'mobile' ? responsiveStyles.mobile.hamburgerBtn : screenSize === 'tablet' ? responsiveStyles.tablet.hamburgerBtn : styles.hamburgerBtn}
              aria-label="Toggle admin menu"
            >
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div style={styles.mobileOverlay} onClick={closeMobileMenu}>
            <div style={styles.mobileMenu} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mobileMenuHeader}>
                <span style={styles.mobileUserName}>{user?.first_name} {user?.last_name}</span>
                <button onClick={handleLogout} style={styles.mobileLogoutBtn}>Logout</button>
              </div>
              <nav style={styles.mobileNav}>
                <Link to="/admin/users" style={styles.mobileNavLink} onClick={closeMobileMenu}>👥 User Management</Link>
                <Link to="/admin/stadiums" style={styles.mobileNavLink} onClick={closeMobileMenu}>🏟️ Stadium Management</Link>
                <Link to="/admin/matches" style={styles.mobileNavLink} onClick={closeMobileMenu}>⚽ Match Management</Link>
                <Link to="/admin/tickets" style={styles.mobileNavLink} onClick={closeMobileMenu}>🎫 Ticket Management</Link>
                <Link to="/admin/orders" style={styles.mobileNavLink} onClick={closeMobileMenu}>📋 Order Management</Link>
                <Link to="/admin/payments" style={styles.mobileNavLink} onClick={closeMobileMenu}>💳 Payment Management</Link>
                <Link to="/admin/reviews" style={styles.mobileNavLink} onClick={closeMobileMenu}>⭐ Reviews Management</Link>
                <Link to="/admin/reports" style={styles.mobileNavLink} onClick={closeMobileMenu}>📊 Reports & Analytics</Link>
                <Link to="/admin/settings" style={styles.mobileNavLink} onClick={closeMobileMenu}>⚙️ System Settings</Link>
              </nav>
            </div>
          </div>
        )}
      </header>

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={fetchDashboardStats} style={styles.retryBtn}>Retry</button>
          </div>
        )}

        {/* Key Metrics */}
        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.stats : screenSize === 'tablet' ? responsiveStyles.tablet.stats : styles.stats}>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #3498db' }}>
            <span style={styles.statNumber}>{formatNumber(stats?.totalUsers)}</span>
            <span style={styles.statLabel}>Registered Users</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #2ecc71' }}>
            <span style={styles.statNumber}>{formatNumber(stats?.totalMatches)}</span>
            <span style={styles.statLabel}>Active Matches</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #e74c3c' }}>
            <span style={styles.statNumber}>{formatNumber(stats?.totalTicketsSold || totalTicketsSold)}</span>
            <span style={styles.statLabel}>Tickets Sold</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #f39c12' }}>
            <span style={styles.statNumber}>{formatNumber(ticketsAvailable)}</span>
            <span style={styles.statLabel}>Tickets Available</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #27ae60' }}>
            <span style={styles.statNumber}>{formatCurrency(totalRevenue)}</span>
            <span style={styles.statLabel}>Total Revenue</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #9b59b6' }}>
            <span style={styles.statNumber}>{formatNumber(recentOrders)}</span>
            <span style={styles.statLabel}>Recent Orders (7 days)</span>
          </div>
        </div>

        <h2 style={styles.sectionTitle}>Management</h2>
        
        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.grid : screenSize === 'tablet' ? responsiveStyles.tablet.grid : styles.grid}>
          {dashboardItems.map((item, index) => (
            <Link to={item.link} key={index} style={styles.cardLink}>
              <div style={{ ...styles.card, borderLeft: `4px solid ${item.color}` }}>
                <h3 style={styles.cardTitle}>{item.title}</h3>
                <p style={styles.cardDescription}>{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
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

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
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
  title: { margin: '0', fontSize: '28px' },
  welcome: { margin: '5px 0 0 0', color: '#bdc3c7', fontSize: '14px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  homeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', padding: '8px 16px',
    borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
  },
  userName: { fontWeight: '600' },
  userRole: { backgroundColor: '#3498db', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' },
  logoutBtn: { backgroundColor: 'transparent', border: '1px solid white', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  hamburgerBtn: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', zIndex: 1001 },
  hamburgerLine: { width: '25px', height: '3px', backgroundColor: 'white', borderRadius: '2px', transition: 'transform 0.3s, opacity 0.3s' },
  mobileOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999, opacity: 1, visibility: 'visible' },
  mobileMenu: { position: 'fixed', top: 0, right: 0, width: '280px', height: '100%', backgroundColor: '#2c3e50', zIndex: 1000, padding: '20px', boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.2)', overflowY: 'auto' },
  mobileMenuHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
  mobileUserName: { color: 'white', fontSize: '16px', fontWeight: '600' },
  mobileLogoutBtn: { backgroundColor: 'transparent', border: '1px solid rgba(255, 255, 255, 0.3)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  mobileNav: { display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileNavLink: { color: 'white', textDecoration: 'none', fontSize: '16px', padding: '12px 16px', borderRadius: '8px' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' },
  errorBanner: { backgroundColor: '#fee2e2', border: '1px solid #ef4444', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  retryBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' },
  statCard: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center' },
  statNumber: { display: 'block', fontSize: '32px', fontWeight: '700', color: '#2c3e50', marginBottom: '8px' },
  statLabel: { fontSize: '14px', color: '#7f8c8d' },
  quickStats: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px' },
  sectionTitle: { fontSize: '20px', color: '#2c3e50', margin: '0 0 16px 0' },
  quickStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
  quickStatItem: { display: 'flex', flexDirection: 'column', gap: '8px' },
  quickStatLabel: { fontSize: '14px', color: '#7f8c8d', fontWeight: '600' },
  quickStatValue: { fontSize: '24px', fontWeight: '700', color: '#2c3e50' },
  // Top matches
  topMatchesList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  topMatchRow: { display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', backgroundColor: '#f8f9fa', borderRadius: '8px' },
  topMatchRank: { fontSize: '16px', fontWeight: '700', color: '#f39c12', minWidth: '28px' },
  topMatchInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  topMatchName: { fontSize: '15px', fontWeight: '600', color: '#2c3e50' },
  topMatchMeta: { fontSize: '12px', color: '#7f8c8d' },
  topMatchRevenue: { fontSize: '18px', fontWeight: '700', color: '#27ae60' },
  noData: { textAlign: 'center', padding: '20px', color: '#95a5a6' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' },
  cardLink: { textDecoration: 'none' },
  card: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  cardTitle: { margin: '0 0 8px 0', fontSize: '18px', color: '#2c3e50' },
  cardDescription: { margin: '0', fontSize: '14px', color: '#7f8c8d' },
};

const responsiveStyles = {
  mobile: {
    main: { ...styles.main, padding: '20px 15px' },
    stats: { ...styles.stats, gridTemplateColumns: '1fr' },
    quickStats: { ...styles.quickStats, padding: '16px' },
    quickStatsGrid: { ...styles.quickStatsGrid, gridTemplateColumns: '1fr' },
    grid: { ...styles.grid, gridTemplateColumns: '1fr' },
    hamburgerBtn: { display: 'flex' },
  },
  tablet: {
    main: { ...styles.main, padding: '30px 15px' },
    stats: { ...styles.stats, gridTemplateColumns: 'repeat(3, 1fr)' },
    quickStats: { ...styles.quickStats, padding: '20px' },
    quickStatsGrid: { ...styles.quickStatsGrid, gridTemplateColumns: 'repeat(2, 1fr)' },
    grid: { ...styles.grid, gridTemplateColumns: 'repeat(2, 1fr)' },
    hamburgerBtn: { display: 'none' },
  }
};

export default AdminDashboard;