import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Badge, Button, Form, InputGroup,
  Spinner, Alert, Table, Modal,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(v || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_COLOR = {
  confirmed: 'success',
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
  refunded: 'secondary',
  cancelled: 'danger',
};

const STATUS_ICON = {
  confirmed: '✅',
  completed: '✅',
  pending: '⏳',
  failed: '❌',
  refunded: '↩️',
  cancelled: '🚫',
};

// ─── Mini Revenue Bar Chart ───────────────────────────────────────────────────
const RevenueChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, padding: '0 4px' }}>
      {data.map((d, i) => {
        const pct = Math.max(4, (d.revenue / max) * 100);
        return (
          <div
            key={i}
            title={`${d.label}: ${fmt(d.revenue)}`}
            style={{
              flex: 1,
              height: `${pct}%`,
              background: `linear-gradient(180deg, #635bff, #8c7ef7)`,
              borderRadius: '4px 4px 0 0',
              cursor: 'default',
              transition: 'opacity 0.2s',
              opacity: 0.85,
              minWidth: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.85)}
          />
        );
      })}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, accent }) => (
  <Card className="h-100 shadow-sm border-0" style={{ borderLeft: `4px solid ${accent}` }}>
    <Card.Body className="d-flex align-items-center gap-3">
      <div
        style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `${accent}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
        }}
      >
        {icon}
      </div>
      <div>
        <div className="fs-4 fw-bold text-dark lh-1 mb-1">{value}</div>
        <div className="small fw-semibold text-muted">{label}</div>
        {sub && <div className="small text-muted opacity-75">{sub}</div>}
      </div>
    </Card.Body>
  </Card>
);

// ─── Stripe Status Badge ──────────────────────────────────────────────────────
const StripeStatusBadge = ({ status }) => {
  const map = {
    checking: { color: '#f39c12', text: '⏳ Checking...', bg: '#fff8e1' },
    connected: { color: '#27ae60', text: '🟢 Stripe Connected', bg: '#e8f8f5' },
    not_configured: { color: '#e74c3c', text: '🔴 Not Configured', bg: '#fdecea' },
    error: { color: '#e74c3c', text: '⚠️ Connection Error', bg: '#fdecea' },
  };
  const s = map[status] || map.checking;
  return (
    <span
      style={{
        background: s.bg, color: s.color, border: `1px solid ${s.color}33`,
        borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600,
      }}
    >
      {s.text}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminPayments = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeStatus, setStripeStatus] = useState('checking');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Refund modal
  const [refundModal, setRefundModal] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundNote, setRefundNote] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMsg, setRefundMsg] = useState('');

  useEffect(() => {
    if (!isAdmin()) navigate('/home');
    fetchOrders();
    checkStripe();
  }, []);

  const checkStripe = async () => {
    try {
      const res = await axios.get('/api/orders/stripe-config');
      setStripeStatus(res.data?.success ? 'connected' : 'not_configured');
    } catch {
      setStripeStatus('not_configured');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/orders?limit=1000', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });
      if (res.data?.success && res.data?.data?.orders) {
        setOrders(res.data.data.orders);
      } else {
        setOrders([]);
      }
    } catch (e) {
      setError('Failed to load payment data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ──
  const normalised = useMemo(() =>
    orders.map((o) => ({
      id: o.id,
      orderNumber: o.order_number || o.orderNumber || '—',
      customerEmail: o.customer_email || o.email || '—',
      customerName: [o.first_name, o.last_name].filter(Boolean).join(' ') || '—',
      amount: parseFloat(o.total_amount || o.amount || 0),
      status: (o.status || 'confirmed').toLowerCase(),
      paymentMethod: o.payment_method || 'stripe',
      matchName: o.match_name || o.notes?.split('Match: ')[1]?.split(' | ')[0] || '—',
      createdAt: o.created_at || o.date || null,
      notes: o.notes || '',
    })),
  [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return normalised.filter((o) => {
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.matchName.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchMethod =
        methodFilter === 'all' || o.paymentMethod.toLowerCase().includes(methodFilter);
      return matchSearch && matchStatus && matchMethod;
    });
  }, [normalised, search, statusFilter, methodFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPIs
  const kpis = useMemo(() => {
    const successful = normalised.filter((o) =>
      ['confirmed', 'completed'].includes(o.status)
    );
    const failed = normalised.filter((o) =>
      ['failed', 'cancelled'].includes(o.status)
    );
    const refunded = normalised.filter((o) => o.status === 'refunded');
    const totalRevenue = successful.reduce((s, o) => s + o.amount, 0);
    const avg = successful.length ? totalRevenue / successful.length : 0;
    return {
      totalRevenue,
      successCount: successful.length,
      failedCount: failed.length,
      refundedCount: refunded.length,
      avgOrderValue: avg,
      totalCount: normalised.length,
    };
  }, [normalised]);

  // Revenue by last 7 days
  const revenueChart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        date: d.toISOString().slice(0, 10),
        revenue: 0,
      };
    });
    normalised
      .filter((o) => ['confirmed', 'completed'].includes(o.status))
      .forEach((o) => {
        const d = o.createdAt ? o.createdAt.slice(0, 10) : null;
        const slot = days.find((s) => s.date === d);
        if (slot) slot.revenue += o.amount;
      });
    return days;
  }, [normalised]);

  // CSV export
  const exportCSV = () => {
    const headers = ['Order #', 'Customer', 'Email', 'Match', 'Amount (€)', 'Status', 'Method', 'Date'];
    const rows = filtered.map((o) => [
      o.orderNumber,
      o.customerName,
      o.customerEmail,
      o.matchName,
      o.amount.toFixed(2),
      o.status,
      o.paymentMethod,
      fmtDate(o.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Refund
  const openRefund = (order) => {
    setRefundTarget(order);
    setRefundNote('');
    setRefundMsg('');
    setRefundModal(true);
  };

  const handleRefund = async () => {
    setRefundLoading(true);
    setRefundMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `/api/admin/orders/${refundTarget.id}/refund`,
        { reason: refundNote },
        { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true }
      );
      if (res.data?.success) {
        setRefundMsg(`✅ Refund successful for order ${refundTarget?.orderNumber}. The user will see the updated status in their My Orders page.`);
        // Update local state so table updates immediately
        setOrders((prev) =>
          prev.map((o) =>
            o.id === refundTarget?.id ? { ...o, status: 'refunded' } : o
          )
        );
      } else {
        setRefundMsg(`❌ ${res.data?.message || 'Refund failed. Please try again.'}`);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Network error';
      setRefundMsg(`❌ ${msg}`);
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="min-vh-100" style={{ background: '#f8f9fa' }}>
      {/* ── Header ── */}
      <header
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#fff',
          padding: '0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
        }}
      >
        <Container fluid="lg" className="py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <Link to="/admin/dashboard" className="btn btn-sm btn-outline-light opacity-75">
                ← Dashboard
              </Link>
              <div>
                <h1 className="h4 mb-0 fw-bold">💳 Payment Management</h1>
                <p className="small mb-0 opacity-60">Stripe · All transactions · Live data</p>
              </div>
              <StripeStatusBadge status={stripeStatus} />
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="text-end">
                <div className="fw-semibold small">{user?.first_name} {user?.last_name}</div>
                <div className="small" style={{ color: '#a78bfa' }}>ADMINISTRATOR</div>
              </div>
              <Button variant="outline-light" size="sm" onClick={() => { logout(); navigate('/login'); }}>
                Logout
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <Container fluid="lg" className="py-4">
        {error && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            {error}
            <Button size="sm" variant="danger" onClick={fetchOrders}>Retry</Button>
          </Alert>
        )}

        {stripeStatus === 'not_configured' && (
          <Alert variant="warning" className="mb-4">
            <strong>⚠️ Stripe keys not configured.</strong> Go to{' '}
            <Link to="/admin/settings">System Settings → Payment</Link> or edit{' '}
            <code>backend/.env</code> to add your <code>STRIPE_SECRET_KEY</code> and{' '}
            <code>STRIPE_PUBLISHABLE_KEY</code>, then restart the backend.
          </Alert>
        )}

        {/* ── KPI Cards ── */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2">Loading payment data...</p>
          </div>
        ) : (
          <>
            <Row className="g-3 mb-4">
              <Col xs={12} sm={6} xl={4}>
                <KpiCard
                  icon="💰"
                  label="Total Revenue"
                  value={fmt(kpis.totalRevenue)}
                  sub={`${kpis.successCount} successful payments`}
                  accent="#635bff"
                />
              </Col>
              <Col xs={12} sm={6} xl={4}>
                <KpiCard
                  icon="✅"
                  label="Successful Payments"
                  value={kpis.successCount.toLocaleString()}
                  sub={`${kpis.totalCount} total transactions`}
                  accent="#27ae60"
                />
              </Col>
              <Col xs={12} sm={6} xl={4}>
                <KpiCard
                  icon="📊"
                  label="Average Order Value"
                  value={fmt(kpis.avgOrderValue)}
                  sub="Per successful payment"
                  accent="#3498db"
                />
              </Col>
              <Col xs={12} sm={6} xl={4}>
                <KpiCard
                  icon="❌"
                  label="Failed / Cancelled"
                  value={kpis.failedCount.toLocaleString()}
                  sub="Requires attention"
                  accent="#e74c3c"
                />
              </Col>
              <Col xs={12} sm={6} xl={4}>
                <KpiCard
                  icon="↩️"
                  label="Refunds Issued"
                  value={kpis.refundedCount.toLocaleString()}
                  sub="Total refunded orders"
                  accent="#f39c12"
                />
              </Col>
              <Col xs={12} sm={6} xl={4}>
                <KpiCard
                  icon="🔒"
                  label="Payment Provider"
                  value="Stripe"
                  sub={stripeStatus === 'connected' ? 'Keys configured ✅' : 'Keys missing ⚠️'}
                  accent="#635bff"
                />
              </Col>
            </Row>

            {/* ── Revenue Chart ── */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h2 className="h6 fw-bold mb-0">📈 Revenue — Last 7 Days</h2>
                    <p className="small text-muted mb-0">Stripe confirmed payments only</p>
                  </div>
                  <span
                    style={{
                      background: '#635bff22', color: '#635bff',
                      borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
                    }}
                  >
                    {fmt(revenueChart.reduce((s, d) => s + d.revenue, 0))} this week
                  </span>
                </div>
                <RevenueChart data={revenueChart} />
                <div
                  style={{
                    display: 'flex', gap: 4,
                    paddingTop: 4,
                  }}
                >
                  {revenueChart.map((d, i) => (
                    <div
                      key={i}
                      style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#adb5bd', minWidth: 6 }}
                    >
                      {d.label}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>

            {/* ── Filters + Table ── */}
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white border-bottom p-3">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                  <h2 className="h6 fw-bold mb-0">📋 All Transactions</h2>
                  <div className="d-flex flex-wrap gap-2">
                    {/* Search */}
                    <InputGroup style={{ maxWidth: 240 }}>
                      <InputGroup.Text>🔍</InputGroup.Text>
                      <Form.Control
                        placeholder="Order #, email, match…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      />
                    </InputGroup>

                    {/* Status filter */}
                    <Form.Select
                      style={{ maxWidth: 150 }}
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="confirmed">✅ Confirmed</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="failed">❌ Failed</option>
                      <option value="refunded">↩️ Refunded</option>
                      <option value="cancelled">🚫 Cancelled</option>
                    </Form.Select>

                    {/* Method filter */}
                    <Form.Select
                      style={{ maxWidth: 150 }}
                      value={methodFilter}
                      onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
                    >
                      <option value="all">All Methods</option>
                      <option value="stripe">Stripe</option>
                    </Form.Select>

                    {/* Export */}
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={exportCSV}
                      title="Export filtered results to CSV"
                    >
                      📥 Export CSV
                    </Button>

                    {/* Refresh */}
                    <Button variant="outline-primary" size="sm" onClick={fetchOrders}>
                      🔄 Refresh
                    </Button>
                  </div>
                </div>
                <div className="small text-muted mt-2">
                  Showing {filtered.length} of {normalised.length} transactions
                </div>
              </Card.Header>

              <div className="table-responsive">
                <Table hover className="mb-0 align-middle" style={{ fontSize: 13 }}>
                  <thead style={{ background: '#f8f9fa' }}>
                    <tr>
                      <th className="ps-3">Order #</th>
                      <th>Customer</th>
                      <th>Match</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-5">
                          {normalised.length === 0 ? (
                            <>
                              <div className="display-4 mb-2">💳</div>
                              <div>No payments found. Orders will appear here after the first purchase.</div>
                            </>
                          ) : (
                            <>🔍 No transactions match your filters.</>
                          )}
                        </td>
                      </tr>
                    ) : (
                      pageData.map((o) => (
                        <tr key={o.id}>
                          <td className="ps-3">
                            <span className="font-monospace fw-semibold" style={{ color: '#635bff' }}>
                              {o.orderNumber}
                            </span>
                          </td>
                          <td>
                            <div className="fw-semibold">{o.customerName}</div>
                            <div className="text-muted small">{o.customerEmail}</div>
                          </td>
                          <td>
                            <span className="text-truncate d-block" style={{ maxWidth: 160 }} title={o.matchName}>
                              {o.matchName}
                            </span>
                          </td>
                          <td>
                            <span className="fw-bold" style={{ color: '#27ae60' }}>
                              {fmt(o.amount)}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: '#635bff15', color: '#635bff',
                                borderRadius: 20, padding: '2px 10px',
                                fontSize: 12, fontWeight: 600,
                              }}
                            >
                              <span
                                style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: '#635bff', display: 'inline-block',
                                }}
                              />
                              {o.paymentMethod === 'stripe' || o.paymentMethod === 'Stripe'
                                ? '🔒 Stripe'
                                : o.paymentMethod}
                            </span>
                          </td>
                          <td>
                            <Badge
                              bg={STATUS_COLOR[o.status] || 'secondary'}
                              className="d-inline-flex align-items-center gap-1"
                              style={{ fontSize: 11 }}
                            >
                              {STATUS_ICON[o.status]} {o.status}
                            </Badge>
                          </td>
                          <td className="text-muted small">{fmtDate(o.createdAt)}</td>
                          <td className="text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              {['confirmed', 'completed'].includes(o.status) && (
                                <Button
                                  size="sm"
                                  variant="outline-warning"
                                  style={{ fontSize: 11 }}
                                  onClick={() => openRefund(o)}
                                  title="Issue a refund for this payment"
                                >
                                  ↩️ Refund
                                </Button>
                              )}
                              {o.status === 'refunded' && (
                                <Badge bg="secondary" style={{ fontSize: 11 }}>Refunded</Badge>
                              )}
                              {['failed', 'cancelled'].includes(o.status) && (
                                <Badge bg="danger" style={{ fontSize: 11 }}>No action</Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Card.Footer className="bg-white border-top">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="small text-muted">
                      Page {page} of {totalPages} · {filtered.length} results
                    </div>
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        ← Prev
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        const p = i + 1;
                        return (
                          <Button
                            key={p}
                            size="sm"
                            variant={p === page ? 'primary' : 'outline-secondary'}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        );
                      })}
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                </Card.Footer>
              )}
            </Card>

            {/* ── Stripe Info Card ── */}
            <Card
              className="shadow-sm border-0 mb-4"
              style={{
                background: 'linear-gradient(135deg, #635bff08, #8c7ef708)',
                border: '1px solid #635bff22 !important',
              }}
            >
              <Card.Body className="p-4">
                <div className="d-flex align-items-start gap-3 flex-wrap">
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                      background: 'linear-gradient(135deg, #635bff, #8c7ef7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28,
                    }}
                  >
                    🔒
                  </div>
                  <div className="flex-grow-1">
                    <h3 className="h6 fw-bold mb-1" style={{ color: '#635bff' }}>
                      Stripe Payment Gateway
                    </h3>
                    <p className="small text-muted mb-3">
                      All payments are processed securely via Stripe. Card data never touches your server —
                      it's tokenized client-side by Stripe.js and charged via the PaymentIntent API.
                    </p>
                    <Row className="g-2">
                      {[
                        { icon: '🔐', label: 'PCI-DSS Compliant', desc: 'Stripe handles all card data securely' },
                        { icon: '⚡', label: 'Instant Confirmation', desc: 'Real-time webhook events (when enabled)' },
                        { icon: '🌍', label: 'Multi-Currency', desc: '135+ currencies supported' },
                        { icon: '📱', label: '3D Secure Ready', desc: 'SCA / 3DS2 authentication supported' },
                      ].map((item) => (
                        <Col key={item.label} xs={12} sm={6} md={3}>
                          <div
                            style={{
                              background: '#fff', borderRadius: 10, padding: '10px 14px',
                              border: '1px solid #635bff22',
                            }}
                          >
                            <div style={{ fontSize: 20 }}>{item.icon}</div>
                            <div className="fw-semibold small mt-1">{item.label}</div>
                            <div className="small text-muted">{item.desc}</div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    <a
                      href="https://dashboard.stripe.com"
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #635bff, #8c7ef7)',
                        color: '#fff', border: 'none', fontWeight: 700,
                      }}
                    >
                      Open Stripe Dashboard ↗
                    </a>
                    <Link
                      to="/admin/settings"
                      className="btn btn-sm btn-outline-secondary"
                    >
                      ⚙️ Configure Keys
                    </Link>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </>
        )}
      </Container>

      {/* ── Refund Modal ── */}
      <Modal show={refundModal} onHide={() => setRefundModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5">↩️ Issue Refund</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {refundTarget && (
            <>
              <div className="bg-light rounded p-3 mb-3">
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Order</span>
                  <span className="fw-semibold font-monospace">{refundTarget.orderNumber}</span>
                </div>
                <div className="d-flex justify-content-between small mt-1">
                  <span className="text-muted">Customer</span>
                  <span>{refundTarget.customerName}</span>
                </div>
                <div className="d-flex justify-content-between small mt-1">
                  <span className="text-muted">Amount</span>
                  <span className="fw-bold text-danger">{fmt(refundTarget.amount)}</span>
                </div>
              </div>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Refund Reason (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="e.g. Match cancelled, customer request…"
                />
              </Form.Group>
              {refundMsg && (
                <Alert variant={refundMsg.startsWith('✅') ? 'success' : 'danger'} className="small">
                  {refundMsg}
                </Alert>
              )}
              <Alert variant="info" className="small mb-0">
                ℹ️ In production this calls <strong>Stripe's Refund API</strong> to reverse the charge.
                The amount will be returned to the customer's card within 5-10 business days.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setRefundModal(false)}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleRefund}
            disabled={refundLoading || !!refundMsg}
          >
            {refundLoading ? <><Spinner size="sm" /> Processing...</> : '↩️ Confirm Refund'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminPayments;
