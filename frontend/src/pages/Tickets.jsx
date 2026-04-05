import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Tickets = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Sample ticket data (would come from API in real app) - Updated for 2026
  const myTickets = [
    {
      id: 1,
      orderNumber: 'ORD-2026-001',
      match: 'Albania vs Kosova',
      date: '2026-04-11',
      time: '20:45',
      stadium: 'National Stadium, Tirana',
      section: 'VIP North',
      row: 'A',
      seat: '12',
      price: 90,
      status: 'confirmed',
      qrCode: 'QR123456789'
    },
    {
      id: 2,
      orderNumber: 'ORD-2026-002',
      match: 'Kosova vs Albania',
      date: '2026-04-18',
      time: '20:45',
      stadium: 'Fadil Vokrri Stadium, Pristina',
      section: 'South Stand',
      row: 'C',
      seat: '45-46',
      price: 50,
      status: 'confirmed',
      qrCode: 'QR987654321'
    },
    {
      id: 3,
      orderNumber: 'ORD-2026-003',
      match: 'Albania vs Serbia',
      date: '2026-04-25',
      time: '20:45',
      stadium: 'National Stadium, Tirana',
      section: 'East Stand',
      row: 'F',
      seat: '23',
      price: 70,
      status: 'pending',
      qrCode: null
    }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'cancelled': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <span style={styles.navTitle}>🏟️ Stadium Tickets</span>
          <div style={styles.navLinks}>
            <a href="/home" style={styles.navLink}>Home</a>
            <a href="/matches" style={styles.navLink}>Matches</a>
            <a href="/tickets" style={{...styles.navLink, fontWeight: 'bold'}}>Tickets</a>
            <a href="/stadiums" style={styles.navLink}>Stadiums</a>
            <a href="/orders" style={styles.navLink}>My Orders</a>
            {isAdmin() && (
              <a href="/admin/dashboard" style={{ ...styles.navLink, fontWeight: 'bold', color: '#f39c12' }}>
                Admin
              </a>
            )}
            <span style={styles.userName}>{user?.firstName || user?.first_name}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.header}>
          <h1>🎫 My Tickets</h1>
          <p>Your purchased tickets with QR codes for easy entry</p>
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{myTickets.length}</span>
            <span style={styles.statLabel}>Total Tickets</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{myTickets.filter(t => t.status === 'confirmed').length}</span>
            <span style={styles.statLabel}>Confirmed</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{myTickets.filter(t => t.status === 'pending').length}</span>
            <span style={styles.statLabel}>Pending</span>
          </div>
        </div>

        <div style={styles.ticketList}>
          {myTickets.map(ticket => (
            <div key={ticket.id} style={styles.ticketCard}>
              <div style={styles.ticketLeft}>
                <div style={styles.ticketHeader}>
                  <span style={styles.orderNumber}>{ticket.orderNumber}</span>
                  <span style={{...styles.status, backgroundColor: getStatusColor(ticket.status)}}>
                    {ticket.status.toUpperCase()}
                  </span>
                </div>
                
                <h3 style={styles.matchTitle}>{ticket.match}</h3>
                
                <div style={styles.ticketDetails}>
                  <p>📅 {ticket.date} at {ticket.time}</p>
                  <p>🏟️ {ticket.stadium}</p>
                  <p>🪑 Section: {ticket.section}, Row: {ticket.row}, Seat: {ticket.seat}</p>
                </div>
              </div>
              
              <div style={styles.ticketDivider}></div>
              
              <div style={styles.ticketRight}>
                {ticket.qrCode ? (
                  <>
                    <div style={styles.qrPlaceholder}>
                      <span style={styles.qrIcon}>📱</span>
                      <span style={styles.qrCode}>{ticket.qrCode}</span>
                    </div>
                    <p style={styles.price}>€{ticket.price}</p>
                    <button style={styles.viewBtn}>View QR</button>
                  </>
                ) : (
                  <>
                    <div style={styles.pendingMessage}>
                      <span style={{fontSize: '24px'}}>⏳</span>
                      <p>Payment Pending</p>
                    </div>
                    <p style={styles.price}>€{ticket.price}</p>
                    <button style={styles.payBtn}>Pay Now</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.infoBox}>
          <h3>ℹ️ Important Information</h3>
          <ul style={styles.infoList}>
            <li>Present your QR code at the stadium entrance for scanning</li>
            <li>Arrive at least 30 minutes before kickoff</li>
            <li>Tickets are non-transferable and must match your ID</li>
            <li>For any issues, contact support at support@stadiumtickets.com</li>
          </ul>
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
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  statNumber: {
    display: 'block',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
  },
  ticketList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '30px',
  },
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    display: 'flex',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  ticketLeft: {
    flex: 1,
    padding: '24px',
  },
  ticketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  orderNumber: {
    fontSize: '12px',
    color: '#7f8c8d',
    fontFamily: 'monospace',
  },
  status: {
    fontSize: '11px',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  matchTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    color: '#2c3e50',
  },
  ticketDetails: {
    fontSize: '14px',
    color: '#7f8c8d',
  },
  ticketDivider: {
    width: '2px',
    backgroundColor: '#eee',
    borderLeft: '2px dashed #ddd',
  },
  ticketRight: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '180px',
  },
  qrPlaceholder: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  qrIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '8px',
  },
  qrCode: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#7f8c8d',
  },
  price: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: '8px 0',
  },
  viewBtn: {
    padding: '8px 20px',
    backgroundColor: '#2c3e50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pendingMessage: {
    textAlign: 'center',
    color: '#f39c12',
    marginBottom: '12px',
  },
  payBtn: {
    padding: '8px 20px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  infoBox: {
    backgroundColor: '#e8f4fd',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #b6e0fe',
  },
  infoList: {
    margin: '12px 0 0 0',
    padding: '0 0 0 20px',
    color: '#2c3e50',
    fontSize: '14px',
  },
};

export default Tickets;