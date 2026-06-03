import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';

const AdminOrders = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/home');
      return;
    }
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      
      const response = await AdminService.getOrders(params);
      if (response.success) {
        setOrders(response.data?.orders || response.data || []);
        setTotalPages(response.data?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      setDeletingId(orderId);
      await AdminService.deleteOrder(orderId);
      setOrders(prev => prev.filter(o => (o.id || o.order_id) !== orderId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete order:', err);
      setError('Failed to delete order');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'completed': return '#3498db';
      case 'cancelled': return '#e74c3c';
      case 'refunded': return '#9b59b6';
      default: return '#7f8c8d';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (!isAdmin()) return null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>📋 Order Management</h1>
            <p style={styles.welcome}>View and manage all ticket orders</p>
          </div>
          <div style={styles.userInfo}>
            <Link to="/admin/dashboard" style={styles.homeBtn}>⬅ Dashboard</Link>
            <span style={styles.userName}>{user?.first_name} {user?.last_name}</span>
            <span style={styles.userRole}>Administrator</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
            <button 
              className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`} 
              onClick={toggleMobileMenu}
              style={screenSize === 'mobile' ? responsiveStyles.mobile.hamburgerBtn : styles.hamburgerBtn}
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
            <button onClick={() => setError(null)} style={styles.retryBtn}>Dismiss</button>
          </div>
        )}

        {/* Filters */}
        <div style={styles.filterBar}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={styles.filterSelect}
            >
              <option value="">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <span style={styles.orderCount}>{orders.length} order(s)</span>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p>Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '48px' }}>📋</span>
            <h2>No Orders Found</h2>
            <p>There are no orders matching your criteria.</p>
          </div>
        ) : (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Order #</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Match</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Payment</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const orderId = order.id || order.order_id;
                    const isDeleting = deletingId === orderId;
                    const showConfirm = confirmDelete === orderId;
                    return (
                      <tr key={orderId} style={styles.tr}>
                        <td style={styles.td}>
                          <strong>{order.order_number || `#${orderId}`}</strong>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.customerInfo}>
                            <span>{order.customer_name || order.first_name || order.user_name || '-'}</span>
                            <span style={styles.customerEmail}>{order.customer_email || order.email || ''}</span>
                          </div>
                        </td>
                        <td style={styles.td}>{order.match_name || order.match || '-'}</td>
                        <td style={{...styles.td, textAlign: 'center'}}>{order.quantity || order.items_count || order.tickets || 0}</td>
                        <td style={{...styles.td, fontWeight: '600', color: '#27ae60'}}>{formatCurrency(order.total_amount || order.total)}</td>
                        <td style={styles.td}>{formatDate(order.created_at || order.date)}</td>
                        <td style={styles.td}>{order.payment_method || order.paymentMethod || '-'}</td>
                        <td style={styles.td}>
                          <span style={{...styles.statusBadge, backgroundColor: getStatusColor(order.status)}}>
                            {(order.status || '').toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {showConfirm ? (
                            <div style={styles.confirmGroup}>
                              <button 
                                style={styles.confirmDeleteBtn}
                                onClick={() => handleDeleteOrder(orderId)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? '...' : '✓ Yes'}
                              </button>
                              <button 
                                style={styles.cancelDeleteBtn}
                                onClick={() => setConfirmDelete(null)}
                              >
                                ✕ No
                              </button>
                            </div>
                          ) : (
                            <button 
                              style={styles.deleteBtn}
                              onClick={() => setConfirmDelete(orderId)}
                            >
                              🗑 Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button 
                  style={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Previous
                </button>
                <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
                <button 
                  style={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#2c3e50', color: 'white', padding: '20px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: '0', fontSize: '28px' },
  welcome: { margin: '5px 0 0 0', color: '#bdc3c7', fontSize: '14px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  homeBtn: { backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' },
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
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '16px' },
  spinner: { width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  errorBanner: { backgroundColor: '#fee2e2', border: '1px solid #ef4444', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  retryBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' },
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '12px' },
  filterLabel: { fontSize: '14px', fontWeight: '600', color: '#2c3e50' },
  filterSelect: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer', outline: 'none' },
  orderCount: { fontSize: '14px', color: '#7f8c8d' },
  emptyState: { textAlign: 'center', padding: '80px 20px', color: '#555', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  tableContainer: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { backgroundColor: '#f8f9fa', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#7f8c8d', borderBottom: '2px solid #eee', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #eee', transition: 'background-color 0.2s' },
  td: { padding: '14px 16px', fontSize: '14px', color: '#2c3e50', verticalAlign: 'middle' },
  customerInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  customerEmail: { fontSize: '12px', color: '#7f8c8d' },
  statusBadge: { fontSize: '11px', color: 'white', padding: '4px 10px', borderRadius: '4px', fontWeight: '600', display: 'inline-block' },
  deleteBtn: { padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  confirmGroup: { display: 'flex', gap: '4px' },
  confirmDeleteBtn: { padding: '6px 10px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  cancelDeleteBtn: { padding: '6px 10px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '24px' },
  pageBtn: { padding: '8px 20px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#2c3e50' },
  pageInfo: { fontSize: '14px', color: '#7f8c8d' },
};

const responsiveStyles = {
  mobile: {
    main: { ...styles.main, padding: '20px 15px' },
    hamburgerBtn: { display: 'flex' },
  },
  tablet: {
    main: { ...styles.main, padding: '30px 15px' },
    hamburgerBtn: { display: 'none' },
  }
};

export default AdminOrders;