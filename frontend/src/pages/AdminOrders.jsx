import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';
import AdminNavbar from '../components/AdminNavbar';
import axios from 'axios';

const AdminOrders = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(null);
  const [refundingId, setRefundingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

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
      if (searchQuery) params.search = searchQuery;
      
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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleViewDetails = async (orderId) => {
    try {
      setSelectedOrder(orderId);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      if (res.data?.success) {
        setOrderDetails(res.data.data);
        setShowDetailsModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      setError('Failed to load order details');
    } finally {
      setSelectedOrder(null);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingStatus(orderId);
      const token = localStorage.getItem('token');
      const res = await axios.patch(`/api/admin/orders/${orderId}/status`, 
        { status: newStatus },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        }
      );
      if (res.data?.success) {
        fetchOrders();
        // Update order details if modal is open
        if (showDetailsModal && orderDetails?.id === orderId) {
          setOrderDetails(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      setError('Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setOrderDetails(null);
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
      <AdminNavbar title="📋 Order Management" subtitle="View and manage all ticket orders" />

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={() => setError(null)} style={styles.retryBtn}>Dismiss</button>
          </div>
        )}

        {/* Filters */}
        <div style={styles.filterBar}>
          <form onSubmit={handleSearch} style={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by order #, customer name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            <button type="submit" style={styles.searchBtn}>🔍 Search</button>
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => { setSearchQuery(''); setPage(1); fetchOrders(); }}
                style={styles.clearSearchBtn}
              >
                ✕ Clear
              </button>
            )}
          </form>
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
                          <div style={styles.actionGroup}>
                            <button 
                              style={styles.viewBtn}
                              onClick={() => handleViewDetails(orderId)}
                              disabled={selectedOrder === orderId}
                            >
                              {selectedOrder === orderId ? '...' : '👁 View'}
                            </button>
                            <button 
                              style={styles.refundBtn}
                              onClick={async () => {
                                setRefundingId(orderId);
                                try {
                                  await AdminService.refundOrder(orderId);
                                  fetchOrders();
                                } catch (err) {
                                  setError('Failed to refund order: ' + err.message);
                                }
                                setRefundingId(null);
                              }}
                              disabled={refundingId === orderId || order.status === 'refunded' || order.status === 'cancelled'}
                            >
                              {refundingId === orderId ? '...' : '💰 Refund'}
                            </button>
                            {confirmPermanentDelete === orderId ? (
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
                                  onClick={() => setConfirmPermanentDelete(null)}
                                >
                                  ✕ No
                                </button>
                              </div>
                            ) : (
                              <button 
                                style={styles.permanentDeleteBtn}
                                onClick={() => setConfirmPermanentDelete(orderId)}
                              >
                                🗑 Delete
                              </button>
                            )}
                          </div>
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

      {/* Order Details Modal */}
      {showDetailsModal && orderDetails && (
        <div style={styles.modalOverlay} onClick={closeDetailsModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                📋 Order {orderDetails.order_number}
              </h2>
              <button style={styles.modalCloseBtn} onClick={closeDetailsModal}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {/* Status Update Section */}
              <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>Update Status</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <select 
                    style={styles.statusSelect}
                    value={orderDetails.status || ''}
                    onChange={(e) => handleStatusChange(orderDetails.id, e.target.value)}
                    disabled={updatingStatus === orderDetails.id}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <button 
                    style={styles.updateStatusBtn}
                    onClick={() => handleStatusChange(orderDetails.id, orderDetails.status)}
                    disabled={updatingStatus === orderDetails.id}
                  >
                    {updatingStatus === orderDetails.id ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>

              {/* Order Information */}
              <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>Order Information</div>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Order Number</span>
                    <span style={styles.detailValue}>{orderDetails.order_number || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Status</span>
                    <span style={{...styles.detailValue, color: getStatusColor(orderDetails.status)}}>
                      {(orderDetails.status || '').toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Total Amount</span>
                    <span style={{...styles.detailValue, color: '#27ae60'}}>{formatCurrency(orderDetails.total_amount)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Payment Method</span>
                    <span style={styles.detailValue}>{orderDetails.payment_method || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Created At</span>
                    <span style={styles.detailValue}>{formatDate(orderDetails.created_at)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Updated At</span>
                    <span style={styles.detailValue}>{formatDate(orderDetails.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div style={styles.detailSection}>
                <div style={styles.detailSectionTitle}>Customer Information</div>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Name</span>
                    <span style={styles.detailValue}>{orderDetails.first_name} {orderDetails.last_name || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Email</span>
                    <span style={styles.detailValue}>{orderDetails.email || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>User ID</span>
                    <span style={styles.detailValue}>{orderDetails.user_id || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              {orderDetails.items && orderDetails.items.length > 0 && (
                <div style={styles.detailSection}>
                  <div style={styles.detailSectionTitle}>Order Items</div>
                  <table style={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Item</th>
                        <th style={styles.th}>Quantity</th>
                        <th style={styles.th}>Unit Price</th>
                        <th style={styles.th}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails.items.map((item, idx) => (
                        <tr key={idx} style={styles.tr}>
                          <td style={styles.td}>
                            {item.home_team && item.away_team 
                              ? `${item.home_team} vs ${item.away_team}`
                              : `Ticket #${item.ticket_id || '-'}`
                            }
                            {item.row_number && item.seat_number && (
                              <div style={{fontSize: '12px', color: '#7f8c8d'}}>
                                Row: {item.row_number}, Seat: {item.seat_number}
                              </div>
                            )}
                          </td>
                          <td style={{...styles.td, textAlign: 'center'}}>{item.quantity || 1}</td>
                          <td style={styles.td}>{formatCurrency(item.unit_price)}</td>
                          <td style={{...styles.td, fontWeight: '600', color: '#27ae60'}}>{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notes */}
              {orderDetails.notes && (
                <div style={styles.detailSection}>
                  <div style={styles.detailSectionTitle}>Notes</div>
                  <div style={{padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '14px', color: '#2c3e50', whiteSpace: 'pre-wrap'}}>
                    {orderDetails.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
  actionGroup: { display: 'flex', gap: '4px', flexWrap: 'nowrap' },
  refundBtn: { padding: '6px 10px', backgroundColor: '#9b59b6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' },
  permanentDeleteBtn: { padding: '6px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  deleteBtn: { padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  confirmGroup: { display: 'flex', gap: '4px' },
  confirmDeleteBtn: { padding: '6px 10px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  cancelDeleteBtn: { padding: '6px 10px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '24px' },
  pageBtn: { padding: '8px 20px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#2c3e50' },
  pageInfo: { fontSize: '14px', color: '#7f8c8d' },
  searchGroup: { display: 'flex', alignItems: 'center', gap: '8px', flex: '1', maxWidth: '500px' },
  searchInput: { flex: '1', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' },
  searchBtn: { padding: '8px 16px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' },
  clearSearchBtn: { padding: '8px 12px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
  viewBtn: { padding: '6px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' },
  // Modal styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalContent: { backgroundColor: 'white', borderRadius: '12px', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' },
  modalTitle: { margin: 0, fontSize: '20px', color: '#2c3e50' },
  modalCloseBtn: { backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7f8c8d', padding: '4px 8px' },
  modalBody: { padding: '24px' },
  detailSection: { marginBottom: '20px' },
  detailSectionTitle: { fontSize: '14px', fontWeight: '600', color: '#7f8c8d', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  detailLabel: { fontSize: '12px', color: '#7f8c8d' },
  detailValue: { fontSize: '15px', color: '#2c3e50', fontWeight: '500' },
  itemsTable: { width: '100%', borderCollapse: 'collapse', marginTop: '12px' },
  statusSelect: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer', outline: 'none', marginRight: '8px' },
  updateStatusBtn: { padding: '8px 16px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
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