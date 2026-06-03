import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useResponsiveStyles from '../hooks/useResponsiveStyles';
import Navbar from '../components/Navbar';
import OrderService from '../services/OrderService';

const Orders = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const userOrders = OrderService.getOrders();
    setOrders(userOrders);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'completed': return '#3498db';
      case 'cancelled': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  const getTotalSpent = () => {
    return orders
      .filter(o => o.status === 'confirmed' || o.status === 'completed')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  };

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        <div style={styles.header}>
          <h1>📋 My Orders</h1>
          <p>View your order history and track your purchases</p>
        </div>

        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.stats : screenSize === 'tablet' ? responsiveStyles.tablet.stats : styles.stats}>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{orders.length}</span>
            <span style={styles.statLabel}>Total Orders</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{orders.filter(o => o.status === 'confirmed' || o.status === 'completed').length}</span>
            <span style={styles.statLabel}>Completed</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>€{getTotalSpent()}</span>
            <span style={styles.statLabel}>Total Spent</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '48px' }}>📋</span>
            <h2>No Orders Yet</h2>
            <p>You haven't purchased any tickets yet.</p>
            <button style={styles.browseBtn} onClick={() => navigate('/matches')}>
              Browse Matches
            </button>
          </div>
        ) : (
          <div style={screenSize === 'mobile' ? responsiveStyles.mobile.orderList : screenSize === 'tablet' ? responsiveStyles.tablet.orderList : styles.orderList}>
            {orders.map(order => (
              <div key={order.id} style={styles.orderCard}>
                <div style={styles.orderHeader}>
                  <div>
                    <span style={styles.orderNumber}>{order.orderNumber}</span>
                    <span style={styles.orderDate}>Placed on {order.date}</span>
                  </div>
                  <span style={{...styles.status, backgroundColor: getStatusColor(order.status)}}>
                    {order.status.toUpperCase()}
                  </span>
                </div>

                <div style={styles.orderContent}>
                  <div style={styles.orderInfo}>
                    <h3 style={styles.matchTitle}>{order.match}</h3>
                    <p style={styles.matchDate}>Match Date: {order.matchDate}</p>
                    <p style={styles.matchCompetition}>🏆 {order.competition || 'Match'}</p>
                    <p style={styles.ticketInfo}>🎫 {order.tickets} ticket(s)</p>
                    <div style={styles.seats}>
                      {order.seats?.map((seat, idx) => (
                        <span key={idx} style={styles.seatTag}>{seat}</span>
                      ))}
                    </div>
                  </div>

                  <div style={styles.orderSummary}>
                    <div style={styles.summaryRow}>
                      <span>Subtotal</span>
                      <span>€{(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>Fees</span>
                      <span>€{(order.fees || 0).toFixed(2)}</span>
                    </div>
                    <div style={{...styles.summaryRow, ...styles.totalRow}}>
                      <span>Total</span>
                      <span>€{(order.total || 0).toFixed(2)}</span>
                    </div>
                    <p style={styles.paymentMethod}>Paid via {order.paymentMethod}</p>
                  </div>
                </div>

                <div style={styles.orderActions}>
                  <button style={styles.primaryBtn}>View Details</button>
                  {order.status === 'confirmed' && (
                    <button style={styles.secondaryBtn}>Download Invoice</button>
                  )}
                  {order.status === 'pending' && (
                    <button style={styles.payBtn}>Complete Payment</button>
                  )}
                </div>
              </div>
            ))}
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
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#555',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  browseBtn: {
    padding: '12px 24px',
    backgroundColor: '#2c3e50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '16px',
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
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
  },
  orderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #eee',
  },
  orderNumber: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50',
    display: 'block',
  },
  orderDate: {
    fontSize: '13px',
    color: '#7f8c8d',
  },
  status: {
    fontSize: '11px',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  orderContent: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
  },
  orderInfo: {
    flex: 1,
  },
  matchTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#2c3e50',
  },
  matchDate: {
    fontSize: '14px',
    color: '#7f8c8d',
    margin: '4px 0',
  },
  matchCompetition: {
    fontSize: '14px',
    color: '#7f8c8d',
    margin: '4px 0',
  },
  ticketInfo: {
    fontSize: '14px',
    margin: '4px 0',
  },
  seats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  },
  seatTag: {
    backgroundColor: '#f8f9fa',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#2c3e50',
  },
  orderSummary: {
    minWidth: '180px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#7f8c8d',
    marginBottom: '8px',
  },
  totalRow: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
    paddingTop: '8px',
    marginTop: '8px',
    borderTop: '1px solid #ddd',
  },
  paymentMethod: {
    fontSize: '12px',
    color: '#7f8c8d',
    marginTop: '12px',
    textAlign: 'center',
  },
  orderActions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #eee',
  },
  primaryBtn: {
    padding: '10px 20px',
    backgroundColor: '#2c3e50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  secondaryBtn: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#2c3e50',
    border: '1px solid #2c3e50',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  payBtn: {
    padding: '10px 20px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};

// Responsive styles
const responsiveStyles = {
  mobile: {
    main: {
      ...styles.main,
      padding: '20px 15px',
    },
    stats: {
      ...styles.stats,
      gridTemplateColumns: '1fr',
    },
    orderList: {
      ...styles.orderList,
      flexDirection: 'column',
    },
    orderContent: {
      ...styles.orderContent,
      flexDirection: 'column',
      gap: '16px',
    },
    orderSummary: {
      ...styles.orderSummary,
      minWidth: 'auto',
      width: '100%',
    },
    orderActions: {
      ...styles.orderActions,
      flexDirection: 'column',
      gap: '8px',
    },
  },
  tablet: {
    main: {
      ...styles.main,
      padding: '30px 15px',
    },
    stats: {
      ...styles.stats,
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
    orderList: {
      ...styles.orderList,
      flexDirection: 'column',
    },
    orderContent: {
      ...styles.orderContent,
      flexDirection: 'row',
      gap: '24px',
    },
  }
};

export default Orders;