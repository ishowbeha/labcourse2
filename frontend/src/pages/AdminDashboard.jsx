import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAdmin()) {
    navigate('/home');
    return null;
  }

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
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>1,234</span>
            <span style={styles.statLabel}>Total Tickets Sold</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>56</span>
            <span style={styles.statLabel}>Active Matches</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>890</span>
            <span style={styles.statLabel}>Registered Users</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>€45,678</span>
            <span style={styles.statLabel}>Total Revenue</span>
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

const styles = {
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
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '40px',
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
  sectionTitle: {
    fontSize: '24px',
    color: '#2c3e50',
    marginBottom: '24px',
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