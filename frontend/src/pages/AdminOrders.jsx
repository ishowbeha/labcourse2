import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Form, Table, Alert, Badge, Spinner, Modal,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';
import axios from 'axios';

const AdminOrders = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
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

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'completed': return 'primary';
      case 'cancelled': return 'danger';
      case 'refunded': return 'secondary';
      default: return 'secondary';
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
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="📋 Order Management" subtitle="View and manage all ticket orders" />

      <Container className="py-4">
        {error && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            {error}
            <Button variant="danger" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </Alert>
        )}

        <Card className="shadow-sm mb-4">
          <Card.Body>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <Form onSubmit={handleSearch} className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                <Form.Control
                  type="text"
                  placeholder="Search by order #, customer name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow-1"
                />
                <Button type="submit" variant="primary">🔍 Search</Button>
                {searchQuery && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setSearchQuery(''); setPage(1); fetchOrders(); }}
                  >
                    ✕ Clear
                  </Button>
                )}
              </Form>
              <div className="d-flex align-items-center gap-2">
                <Form.Label className="mb-0 fw-semibold small">Status:</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="w-auto"
                >
                  <option value="">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </Form.Select>
              </div>
              <span className="text-muted small">{orders.length} order(s)</span>
            </div>
          </Card.Body>
        </Card>

        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-3">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mb-0">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card className="shadow-sm text-center py-5">
            <Card.Body>
              <div className="display-4 mb-3">📋</div>
              <h2 className="h5">No Orders Found</h2>
              <p className="text-muted mb-0">There are no orders matching your criteria.</p>
            </Card.Body>
          </Card>
        ) : (
          <>
            <Card className="shadow-sm">
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Match</th>
                      <th className="text-center">Qty</th>
                      <th>Total</th>
                      <th>Date</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const orderId = order.id || order.order_id;
                      const isDeleting = deletingId === orderId;
                      return (
                        <tr key={orderId}>
                          <td><strong>{order.order_number || `#${orderId}`}</strong></td>
                          <td>
                            <div>{order.customer_name || order.first_name || order.user_name || '-'}</div>
                            <div className="text-muted small">{order.customer_email || order.email || ''}</div>
                          </td>
                          <td>{order.match_name || order.match || '-'}</td>
                          <td className="text-center">{order.quantity || order.items_count || order.tickets || 0}</td>
                          <td className="fw-semibold text-success">{formatCurrency(order.total_amount || order.total)}</td>
                          <td>{formatDate(order.created_at || order.date)}</td>
                          <td>{order.payment_method || order.paymentMethod || '-'}</td>
                          <td>
                            <Badge bg={getStatusVariant(order.status)}>
                              {(order.status || '').toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex flex-nowrap gap-1">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleViewDetails(orderId)}
                                disabled={selectedOrder === orderId}
                              >
                                {selectedOrder === orderId ? '...' : '👁 View'}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
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
                              </Button>
                              {confirmPermanentDelete === orderId ? (
                                <div className="d-flex gap-1">
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleDeleteOrder(orderId)}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? '...' : '✓ Yes'}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setConfirmPermanentDelete(null)}
                                  >
                                    ✕ No
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setConfirmPermanentDelete(orderId)}
                                >
                                  🗑 Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card>

            {totalPages > 1 && (
              <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                <Button variant="outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  ← Previous
                </Button>
                <span className="text-muted small">Page {page} of {totalPages}</span>
                <Button variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </Container>

      <Modal show={showDetailsModal && !!orderDetails} onHide={closeDetailsModal} size="lg" scrollable>
        {orderDetails && (
          <>
            <Modal.Header closeButton className="bg-light">
              <Modal.Title className="h5">📋 Order {orderDetails.order_number}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-4">
                <h6 className="text-muted text-uppercase small fw-semibold mb-3">Update Status</h6>
                <div className="d-flex align-items-center gap-2">
                  <Form.Select
                    className="w-auto"
                    value={orderDetails.status || ''}
                    onChange={(e) => handleStatusChange(orderDetails.id, e.target.value)}
                    disabled={updatingStatus === orderDetails.id}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </Form.Select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStatusChange(orderDetails.id, orderDetails.status)}
                    disabled={updatingStatus === orderDetails.id}
                  >
                    {updatingStatus === orderDetails.id ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              </div>

              <div className="mb-4">
                <h6 className="text-muted text-uppercase small fw-semibold mb-3">Order Information</h6>
                <Row className="g-3">
                  <Col sm={6}>
                    <div className="text-muted small">Order Number</div>
                    <div className="fw-medium">{orderDetails.order_number || '-'}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small">Status</div>
                    <Badge bg={getStatusVariant(orderDetails.status)}>
                      {(orderDetails.status || '').toUpperCase()}
                    </Badge>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small">Total Amount</div>
                    <div className="fw-medium text-success">{formatCurrency(orderDetails.total_amount)}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small">Payment Method</div>
                    <div className="fw-medium">{orderDetails.payment_method || '-'}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small">Created At</div>
                    <div className="fw-medium">{formatDate(orderDetails.created_at)}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small">Updated At</div>
                    <div className="fw-medium">{formatDate(orderDetails.updated_at)}</div>
                  </Col>
                </Row>
              </div>

              <div className="mb-4">
                <h6 className="text-muted text-uppercase small fw-semibold mb-3">Customer Information</h6>
                <Row className="g-3">
                  <Col sm={6}>
                    <div className="text-muted small">Name</div>
                    <div className="fw-medium">{orderDetails.first_name} {orderDetails.last_name || '-'}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small">Email</div>
                    <div className="fw-medium">{orderDetails.email || '-'}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small">User ID</div>
                    <div className="fw-medium">{orderDetails.user_id || '-'}</div>
                  </Col>
                </Row>
              </div>

              {orderDetails.items && orderDetails.items.length > 0 && (
                <div className="mb-4">
                  <h6 className="text-muted text-uppercase small fw-semibold mb-3">Order Items</h6>
                  <div className="table-responsive">
                    <Table size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Item</th>
                          <th className="text-center">Quantity</th>
                          <th>Unit Price</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderDetails.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              {item.home_team && item.away_team
                                ? `${item.home_team} vs ${item.away_team}`
                                : `Ticket #${item.ticket_id || '-'}`
                              }
                              {item.row_number && item.seat_number && (
                                <div className="text-muted small">
                                  Row: {item.row_number}, Seat: {item.seat_number}
                                </div>
                              )}
                            </td>
                            <td className="text-center">{item.quantity || 1}</td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td className="fw-semibold text-success">{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}

              {orderDetails.notes && (
                <div>
                  <h6 className="text-muted text-uppercase small fw-semibold mb-3">Notes</h6>
                  <div className="bg-light rounded p-3 small text-dark text-pre-wrap">
                    {orderDetails.notes}
                  </div>
                </div>
              )}
            </Modal.Body>
          </>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrders;
