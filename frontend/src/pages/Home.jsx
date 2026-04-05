import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import UserList from '../components/UserList';
import NotificationBell from '../components/NotificationBell';

const Home = () => {
  const { user, isAdmin, logout } = useAuth();
  const { connected, onlineCount } = useSocket();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <span style={styles.navTitle}>🏟️ Stadium Tickets</span>
          <div style={styles.navLinks}>
            <a href="/home" style={styles.navLink}>Home</a>
            <a href="/matches" style={styles.navLink}>Matches</a>
            <a href="/tickets" style={styles.navLink}>Tickets</a>
            <a href="/stadiums" style={styles.navLink}>Stadiums</a>
            <a href="/orders" style={styles.navLink}>My Orders</a>
            {isAdmin() && (
              <a href="/admin/dashboard" style={{ ...styles.navLink, fontWeight: 'bold', color: '#f39c12' }}>
                Admin
              </a>
            )}
            <NotificationBell />
            <span style={styles.userName}>{user?.firstName || user?.first_name}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.welcome}>
          <h1>🏟️ Welcome, {user?.firstName || user?.first_name}!</h1>
          <p style={styles.subtitle}>Stadium Ticket Management System</p>
          {connected && (
            <p style={styles.onlineStatus}>
              <span style={styles.onlineDot}></span>
              {onlineCount} user{onlineCount !== 1 ? 's' : ''} online
            </p>
          )}
        </div>

        <div style={styles.dashboard}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>⚽ Matches</h3>
            <p>Browse upcoming football matches and purchase tickets.</p>
            <a href="/matches" style={styles.cardLink}>View Matches →</a>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🎫 My Tickets</h3>
            <p>View and manage your purchased tickets.</p>
            <a href="/tickets" style={styles.cardLink}>View Tickets →</a>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📋 Orders</h3>
            <p>Check your order history and status.</p>
            <a href="/orders" style={styles.cardLink}>View Orders →</a>
          </div>
        </div>

        {isAdmin() && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>👥 User Management (Admin Only)</h2>
            <UserList />
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  nav: {
    backgroundColor: '#2c3e50',
    padding: '15px 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navTitle: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '14px',
  },
  userName: {
    color: '#bdc3c7',
    fontSize: '14px',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid white',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  welcome: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  subtitle: {
    color: '#7f8c8d',
    fontSize: '18px',
    marginTop: '10px',
  },
  onlineStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#27ae60',
    marginTop: '10px',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#27ae60',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  dashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    color: '#2c3e50',
  },
  cardLink: {
    display: 'inline-block',
    marginTop: '12px',
    color: '#3498db',
    textDecoration: 'none',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    color: '#2c3e50',
  },
};

export default Home;