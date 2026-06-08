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
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const STATUS_COLOR = {
  available: '#27ae60',
  sold:      '#635bff',
  reserved:  '#f39c12',
};

const STATUS_BG = {
  available: '#e8f8f5',
  sold:      '#f0efff',
  reserved:  '#fff8e1',
};

const STATUS_LABEL = {
  available: '✅ Available',
  sold:      '🎫 Sold',
  reserved:  '⏳ Reserved',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, accent }) => (
  <Card className="h-100 shadow-sm border-0" style={{ borderLeft: `4px solid ${accent}` }}>
    <Card.Body className="d-flex align-items-center gap-3">
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: `${accent}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26,
      }}>
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

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminTickets = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [kpi, setKpi] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Status change modal
  const [statusModal, setStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [newStatus, setNewStatus] = useState('available');
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin()) navigate('/home');
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter]);

  const fetchTickets = useCallback(async (q = search) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(q.trim() ? { search: q.trim() } : {}),
      });

      const res = await axios.get(`/api/admin/tickets?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });

      if (res.data?.success) {
        const d = res.data.data;
        setTickets(d.tickets || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
        setKpi(d.kpi || {});
      }
    } catch (e) {
      setError('Failed to load ticket data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  const handleSearch = () => {
    setPage(1);
    fetchTickets(search);
  };

  const openStatusModal = (ticket) => {
    setStatusTarget(ticket);
    setNewStatus(ticket.status);
    setStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    setStatusLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(
        `/api/admin/tickets/${statusTarget.id}/status`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true }
      );
      if (res.data?.success) {
        setSuccess(`✅ Ticket #${statusTarget.id} status updated to "${newStatus}"`);
        setStatusModal(false);
        fetchTickets();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(`❌ ${err?.response?.data?.message || err.message}`);
    } finally {
      setStatusLoading(false);
    }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['ID', 'Match', 'Match Date', 'Section', 'Row', 'Seat', 'Price (€)', 'Status', 'Purchaser Email', 'Purchased At'];
    const rows = tickets.map((t) => [
      t.id,
      t.match_name || '—',
      fmtDate(t.match_date),
      t.section_name || '—',
      t.row_number || '—',
      t.seat_number || '—',
      (t.price || 0).toFixed(2),
      t.status,
      t.purchaser_email || '—',
      fmtDate(t.purchased_at),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin()) return null;

  return (
    <div className="min-vh-100" style={{ background: '#f8f9fa' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#fff', padding: 0, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
      }}>
        <Container fluid="lg" className="py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <Link to="/admin/dashboard" className="btn btn-sm btn-outline-light opacity-75">
                ← Dashboard
              </Link>
              <div>
                <h1 className="h4 mb-0 fw-bold">🎫 Ticket Management</h1>
                <p className="small mb-0 opacity-60">View, filter and update all seat tickets</p>
              </div>
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
          <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-3">
            {error}
            <Button size="sm" variant="danger" onClick={() => setError('')}>Dismiss</Button>
          </Alert>
        )}
        {success && <Alert variant="success" className="mb-3">{success}</Alert>}

        {/* ── KPI Cards ── */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} xl={3}>
            <KpiCard icon="🎫" label="Total Tickets" value={(kpi.total_tickets || 0).toLocaleString()} sub="All seat records" accent="#635bff" />
          </Col>
          <Col xs={12} sm={6} xl={3}>
            <KpiCard icon="✅" label="Available" value={(kpi.available || 0).toLocaleString()} sub="Ready to purchase" accent="#27ae60" />
          </Col>
          <Col xs={12} sm={6} xl={3}>
            <KpiCard icon="🛒" label="Sold" value={(kpi.sold || 0).toLocaleString()} sub="Confirmed sales" accent="#3498db" />
          </Col>
          <Col xs={12} sm={6} xl={3}>
            <KpiCard icon="💰" label="Revenue from Sales" value={fmt(kpi.revenue)} sub={`${(kpi.reserved || 0).toLocaleString()} reserved`} accent="#f39c12" />
          </Col>
        </Row>

        {/* ── Occupancy Bar ── */}
        {kpi.total_tickets > 0 && (
          <Card className="shadow-sm border-0 mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 fw-bold mb-0">🏟️ Seat Occupancy Overview</h2>
                <span className="small text-muted">
                  {Math.round((kpi.sold / kpi.total_tickets) * 100)}% sold
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 8, background: '#e9ecef', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(kpi.sold / kpi.total_tickets) * 100}%`, background: '#635bff', transition: 'width 0.5s' }} />
                <div style={{ width: `${(kpi.reserved / kpi.total_tickets) * 100}%`, background: '#f39c12', transition: 'width 0.5s' }} />
              </div>
              <div className="d-flex gap-4 mt-2">
                {[
                  { color: '#635bff', label: 'Sold' },
                  { color: '#f39c12', label: 'Reserved' },
                  { color: '#27ae60', label: 'Available' },
                ].map(({ color, label }) => (
                  <div key={label} className="d-flex align-items-center gap-1 small text-muted">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* ── Filters + Table ── */}
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-white border-bottom p-3">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
              <h2 className="h6 fw-bold mb-0">📋 All Tickets</h2>
              <div className="d-flex flex-wrap gap-2">

                {/* Search */}
                <InputGroup style={{ maxWidth: 260 }}>
                  <InputGroup.Text>🔍</InputGroup.Text>
                  <Form.Control
                    placeholder="Match, section, email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </InputGroup>
                <Button variant="primary" size="sm" onClick={handleSearch}>Search</Button>

                {/* Status filter */}
                <Form.Select
                  style={{ maxWidth: 160 }}
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="all">All Statuses</option>
                  <option value="available">✅ Available</option>
                  <option value="sold">🎫 Sold</option>
                  <option value="reserved">⏳ Reserved</option>
                </Form.Select>

                {/* Export */}
                <Button variant="outline-success" size="sm" onClick={exportCSV} title="Export to CSV">
                  📥 Export CSV
                </Button>

                {/* Refresh */}
                <Button variant="outline-primary" size="sm" onClick={() => fetchTickets()}>
                  🔄 Refresh
                </Button>
              </div>
            </div>
            <div className="small text-muted mt-2">
              Showing {tickets.length} of {total} tickets
            </div>
          </Card.Header>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2 mb-0">Loading tickets…</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle" style={{ fontSize: 13 }}>
                  <thead style={{ background: '#f8f9fa' }}>
                    <tr>
                      <th className="ps-3">ID</th>
                      <th>Match</th>
                      <th>Date</th>
                      <th>Section</th>
                      <th>Seat</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Purchaser</th>
                      <th>Purchased</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center text-muted py-5">
                          <div className="display-4 mb-2">🎫</div>
                          <div>No tickets match your filters.</div>
                        </td>
                      </tr>
                    ) : (
                      tickets.map((t) => (
                        <tr key={t.id}>
                          <td className="ps-3">
                            <span className="font-monospace fw-semibold text-muted">#{t.id}</span>
                          </td>
                          <td>
                            <span className="fw-semibold" style={{ color: '#1a1a2e' }}>{t.match_name || '—'}</span>
                            {t.competition && (
                              <div className="small text-muted">{t.competition}</div>
                            )}
                          </td>
                          <td className="text-muted small">{fmtDate(t.match_date)}</td>
                          <td>
                            {t.section_name ? (
                              <span style={{
                                background: '#f0efff', color: '#635bff',
                                borderRadius: 20, padding: '2px 10px',
                                fontSize: 12, fontWeight: 600,
                              }}>
                                {t.section_name}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="text-muted small">
                            {t.row_number && t.seat_number
                              ? `R${t.row_number} S${t.seat_number}`
                              : '—'}
                          </td>
                          <td>
                            <span className="fw-bold" style={{ color: '#27ae60' }}>
                              {fmt(t.price)}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              background: STATUS_BG[t.status] || '#f8f9fa',
                              color: STATUS_COLOR[t.status] || '#666',
                              borderRadius: 20,
                              padding: '3px 12px',
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'inline-block',
                            }}>
                              {STATUS_LABEL[t.status] || t.status}
                            </span>
                          </td>
                          <td>
                            {t.purchaser_email ? (
                              <>
                                <div className="fw-semibold small">{t.first_name} {t.last_name}</div>
                                <div className="text-muted" style={{ fontSize: 11 }}>{t.purchaser_email}</div>
                              </>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                          <td className="text-muted small">{fmtDate(t.purchased_at)}</td>
                          <td className="text-center">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              style={{ fontSize: 11 }}
                              onClick={() => openStatusModal(t)}
                              title="Change ticket status"
                            >
                              ✏️ Status
                            </Button>
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
                      Page {page} of {totalPages} · {total} results
                    </div>
                    <div className="d-flex gap-1">
                      <Button size="sm" variant="outline-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                        ← Prev
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant={p === page ? 'primary' : 'outline-secondary'}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      ))}
                      <Button size="sm" variant="outline-secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                        Next →
                      </Button>
                    </div>
                  </div>
                </Card.Footer>
              )}
            </>
          )}
        </Card>

        {/* ── Info Card ── */}
        <Card className="shadow-sm border-0 mt-4" style={{ background: 'linear-gradient(135deg, #1a1a2e08, #16213e05)' }}>
          <Card.Body className="p-4">
            <h3 className="h6 fw-bold mb-3" style={{ color: '#635bff' }}>ℹ️ Ticket Status Guide</h3>
            <Row className="g-3">
              {[
                { icon: '✅', label: 'Available', desc: 'Seat is open for purchase. Visible to users on the tickets page.', color: '#27ae60' },
                { icon: '⏳', label: 'Reserved', desc: 'Seat is temporarily held (e.g. in cart). Auto-expires if unpaid.', color: '#f39c12' },
                { icon: '🎫', label: 'Sold', desc: 'Seat has been purchased. Linked to a confirmed order.', color: '#635bff' },
              ].map((item) => (
                <Col key={item.label} xs={12} md={4}>
                  <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', border: `1px solid ${item.color}22` }}>
                    <div style={{ fontSize: 22 }}>{item.icon}</div>
                    <div className="fw-semibold small mt-1" style={{ color: item.color }}>{item.label}</div>
                    <div className="small text-muted mt-1">{item.desc}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      </Container>

      {/* ── Status Change Modal ── */}
      <Modal show={statusModal} onHide={() => setStatusModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5">✏️ Update Ticket Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {statusTarget && (
            <>
              <div className="bg-light rounded p-3 mb-3">
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-muted">Ticket ID</span>
                  <span className="fw-semibold font-monospace">#{statusTarget.id}</span>
                </div>
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-muted">Match</span>
                  <span>{statusTarget.match_name || '—'}</span>
                </div>
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-muted">Section</span>
                  <span>{statusTarget.section_name || '—'}</span>
                </div>
                <div className="d-flex justify-content-between small">
                  <span className="text-muted">Current Status</span>
                  <span style={{ color: STATUS_COLOR[statusTarget.status], fontWeight: 700 }}>
                    {STATUS_LABEL[statusTarget.status]}
                  </span>
                </div>
              </div>

              <Form.Group>
                <Form.Label className="small fw-semibold">New Status</Form.Label>
                <Form.Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="available">✅ Available — release for purchase</option>
                  <option value="reserved">⏳ Reserved — hold temporarily</option>
                  <option value="sold">🎫 Sold — mark as purchased</option>
                </Form.Select>
              </Form.Group>

              {newStatus === 'available' && statusTarget.status === 'sold' && (
                <Alert variant="warning" className="small mt-3 mb-0">
                  ⚠️ Releasing a sold ticket will clear the purchaser. Make sure the order has been refunded first.
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setStatusModal(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleStatusUpdate}
            disabled={statusLoading || newStatus === statusTarget?.status}
          >
            {statusLoading ? <Spinner animation="border" size="sm" /> : 'Update Status'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminTickets;
