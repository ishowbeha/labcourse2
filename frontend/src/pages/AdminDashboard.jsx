import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';

const AdminDashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

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
  };

  if (!isAdmin()) {
    navigate('/home');
    return null;
  }

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
            <Link to="/home" style={styles.homeBtn}>
              🏠 Home
            </Link>
            <span style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </span>
            <span style={styles.userRole}>Administrator</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={fetchDashboardStats} style={styles.retryBtn}>Retry</button>
          </div>
        )}

        <div style={styles.stats}>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #3498db' }}>
            <span style={styles.statNumber}>{formatNumber(stats?.totalUsers)}</span>
            <span style={styles.statLabel}>Registered Users</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #2ecc71' }}>
            <span style={styles.statNumber}>{formatNumber(stats?.totalMatches)}</span>
            <span style={styles.statLabel}>Active Matches</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #e74c3c' }}>
            <span style={styles.statNumber}>{formatNumber(stats?.totalTicketsSold)}</span>
            <span style={styles.statLabel}>Tickets Sold</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #f39c12' }}>
            <span style={styles.statNumber}>{formatCurrency(stats?.totalRevenue)}</span>
            <span style={styles.statLabel}>Total Revenue</span>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div style={styles.quickStats}>
          <h2 style={styles.sectionTitle}>📈 Quick Overview</h2>
          <div style={styles.quickStatsGrid}>
            <div style={styles.quickStatItem}>
              <span style={styles.quickStatLabel}>Recent Orders (7 days)</span>
              <span style={styles.quickStatValue}>{stats?.recentOrders || 0}</span>
            </div>
            <div style={styles.quickStatItem}>
              <span style={styles.quickStatLabel}>Ticket Status Distribution</span>
              <div style={styles.ticketStatus}>
                {stats?.ticketsByStatus?.map((ticket) => (
                  <div key={ticket.status} style={styles.ticketStatusItem}>
                    <span style={{
                      ...styles.ticketStatusDot,
                      backgroundColor: getStatusColor(ticket.status)
                    }}></span>
                    <span>{ticket.status}: {ticket.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <h2 style={styles.sectionTitle}>Management</h2>
        
        <div style={styles.grid}>
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
  title: {
    margin: '0',
    fontSize: '28px',
  },
  welcome: {
    margin: '5px 0 0 0',
    color: '#bdc3c7',
    fontSize: '14px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  homeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s',
  },
  userName: {
    fontWeight: '600',
  },
  userRole: {
    backgroundColor: '#3498db',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
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
    padding: '30px 20px',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    textAlign: 'center',
  },
  statNumber: {
    display: 'block',
    fontSize: '32px',
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
  },
  quickStats: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    color: '#2c3e50',
    marginBottom: '16px',
  },
  quickStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  quickStatItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  quickStatLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
    fontWeight: '600',
  },
  quickStatValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2c3e50',
  },
  ticketStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  ticketStatusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#555',
  },
  ticketStatusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
  },
  cardLink: {
    textDecoration: 'none',
  },
  card: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#2c3e50',
  },
  cardDescription: {
    margin: '0',
    fontSize: '14px',
    color: '#7f8c8d',
  },
};

export default AdminDashboard;