import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Form, Table, Alert, Badge, Spinner, ProgressBar,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import OrderService from '../services/OrderService';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';
import api from '../services/api';
import axios from 'axios';

const AdminReports = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [ticketSales, setTicketSales] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [topMatches, setTopMatches] = useState([]);
  const [localOrders, setLocalOrders] = useState([]);
  const [error, setError] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [filterAction, setFilterAction] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [dynamicReport, setDynamicReport] = useState(null);
  const [drLoading, setDrLoading] = useState(false);
  const [drForm, setDrForm] = useState({
    dateFrom: '', dateTo: '',
    metrics: ['tickets_sold', 'revenue'],
    groupBy: 'none',
    filters: { status: '' }
  });

  useEffect(() => {
    if (!isAdmin()) { navigate('/home'); return; }
    const local = OrderService.getOrders();
    setLocalOrders(local);
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/admin/orders?limit=1000', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        });
        if (res.data?.success && res.data?.data?.orders) {
          const existing = OrderService.getOrders();
          const existingNums = new Set(existing.map(o => o.orderNumber));
          const backendOrders = res.data.data.orders
            .filter(o => !existingNums.has(o.order_number))
            .map(o => ({
              id: o.id, orderNumber: o.order_number,
              date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '',
              match: typeof o.match_name === 'string' ? o.match_name.replace(/^Match:\s*/i, '') : 'Match',
              tickets: o.ticket_count || 1,
              total: parseFloat(o.total_amount) || 0,
              status: o.status || 'confirmed',
              paymentMethod: o.payment_method || 'Credit Card',
              matchDate: o.created_at
            }));
          if (backendOrders.length > 0) setLocalOrders(prev => [...prev, ...backendOrders]);
        }
      } catch (e) { console.log('Backend orders:', e.message); }
    })();
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [salesRes, revenueRes, topRes] = await Promise.all([
        AdminService.getTicketSalesByMatch(),
        AdminService.getRevenueAnalytics('monthly'),
        AdminService.getTopSellingMatches(10)
      ]);
      if (salesRes.success) setTicketSales(salesRes.data || []);
      if (revenueRes.success) setRevenueData(revenueRes.data || []);
      if (topRes.success) setTopMatches(topRes.data || []);
      try {
        const activityRes = await api.get('/reports/activity-logs?limit=100');
        if (activityRes.data?.logs) setActivityLogs(activityRes.data.logs);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); setMobileMenuOpen(false); };
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(value || 0);
  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

  const getActionBadgeVariant = (action) => {
    switch (action) {
      case 'login': return 'primary';
      case 'purchase': return 'success';
      case 'register': return 'info';
      default: return 'secondary';
    }
  };

  if (!isAdmin()) return null;

  const confirmedLocalOrders = localOrders.filter(o => o.status === 'confirmed' || o.status === 'completed');
  const localTicketsSold = confirmedLocalOrders.reduce((sum, o) => sum + (o.tickets || 0), 0);
  const localRevenue = confirmedLocalOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalTicketsSold = (ticketSales.reduce((sum, m) => sum + (m.sold_tickets || 0), 0)) + localTicketsSold;
  const totalRevenue = (ticketSales.reduce((sum, m) => sum + (m.total_revenue || 0), 0)) + localRevenue;

  const dbMatchesMap = {};
  ticketSales.forEach(m => {
    const key = `${m.home_team || ''} vs ${m.away_team || ''}`;
    dbMatchesMap[key] = { match: key, date: m.match_date, stadium: m.stadium_name || 'N/A', ticketsSold: m.sold_tickets || 0, totalTickets: m.total_tickets || 0, revenue: m.total_revenue || 0, basePrice: m.base_price || 0, status: m.match_status || 'scheduled' };
  });
  confirmedLocalOrders.forEach(o => {
    const key = o.match || 'Unknown Match';
    if (dbMatchesMap[key]) { dbMatchesMap[key].ticketsSold += o.tickets || 0; dbMatchesMap[key].revenue += o.total || 0; }
    else { dbMatchesMap[key] = { match: key, date: o.matchDate || o.date || o.created_at, stadium: o.stadium || 'N/A', ticketsSold: o.tickets || 0, totalTickets: o.tickets || 0, revenue: o.total || 0, basePrice: Math.round((o.total || 0) / (o.tickets || 1)), status: 'confirmed' }; }
  });

  const allMatches = Object.values(dbMatchesMap).filter(m => m.ticketsSold > 0);
  const mostProfitable = [...allMatches].sort((a, b) => b.revenue - a.revenue);
  const topSelling = [...allMatches].sort((a, b) => b.ticketsSold - a.ticketsSold);

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard Overview' },
    { id: 'matches', label: '⚽ Match Sales (Most Profitable)' },
    { id: 'revenue', label: '💰 Revenue Analytics' },
    { id: 'activity', label: '📋 Activity Logs' },
    { id: 'dynamic', label: '🔧 Dynamic Report' },
  ];

  const SummaryCards = ({ cards }) => (
    <Row className="g-3 mb-4">
      {cards.map((card, i) => (
        <Col key={i} xs={12} md={4}>
          <Card className={`h-100 border-top border-4 ${card.borderClass}`}>
            <Card.Body className="text-center bg-light">
              <div className="fs-4 fw-bold text-dark">{card.value}</div>
              <div className="text-muted small">{card.label}</div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const MatchTable = ({ matches, showStadium }) => (
    <div className="table-responsive">
      <Table hover className="mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Match</th>
            <th>Date</th>
            {showStadium && <th>Stadium</th>}
            <th>Tickets Sold</th>
            {showStadium && <th>Available</th>}
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={i} className={i < 3 ? 'table-secondary' : ''}>
              <td>
                {i < 3 ? (
                  <Badge bg="warning" pill>{i + 1}</Badge>
                ) : i + 1}
              </td>
              <td><strong>{m.match}</strong></td>
              <td>{formatDate(m.date)}</td>
              {showStadium && <td>{m.stadium}</td>}
              <td><span className="fw-semibold text-primary">{m.ticketsSold}</span></td>
              {showStadium && <td>{Math.max(0, (m.totalTickets || 600) - m.ticketsSold)}</td>}
              <td><strong className="text-success">{formatCurrency(m.revenue)}</strong></td>
            </tr>
          ))}
          {matches.length === 0 && (
            <tr>
              <td colSpan={showStadium ? 7 : 5} className="text-center text-muted py-4">
                No sales data available yet
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );

  return (
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="📊 Reports & Analytics" subtitle="Sales, revenue and activity reports" />

      <Container className="py-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-2 mb-0">Loading reports...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title className="h5 mb-4">📊 Analytics Dashboard</Card.Title>
                  <SummaryCards cards={[
                    { value: formatNumber(totalTicketsSold), label: 'Total Tickets Sold', borderClass: 'border-danger' },
                    { value: formatCurrency(totalRevenue), label: 'Total Revenue', borderClass: 'border-success' },
                    { value: formatNumber(allMatches.length), label: 'Total Matches with Sales', borderClass: 'border-primary' },
                  ]} />
                  <h3 className="h6 text-dark mb-3">🏆 Most Profitable (by Revenue)</h3>
                  <MatchTable matches={mostProfitable.slice(0, 20)} showStadium={false} />
                </Card.Body>
              </Card>
            )}

            {activeTab === 'matches' && (
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title className="h5 mb-4">⚽ All Match Sales (Most Profitable First)</Card.Title>
                  <SummaryCards cards={[
                    { value: formatNumber(totalTicketsSold), label: 'Total Tickets Sold', borderClass: 'border-success' },
                    { value: formatCurrency(totalRevenue), label: 'Total Revenue', borderClass: 'border-primary' },
                    { value: formatNumber(allMatches.length), label: 'Matches with Sales', borderClass: 'border-warning' },
                  ]} />
                  <MatchTable matches={mostProfitable} showStadium={true} />
                </Card.Body>
              </Card>
            )}

            {activeTab === 'activity' && (
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                    <Card.Title className="h5 mb-0">📋 User Activity Log</Card.Title>
                    <Form.Select
                      className="w-auto"
                      value={filterAction}
                      onChange={(e) => setFilterAction(e.target.value)}
                    >
                      <option value="">All Actions</option>
                      <option value="login">Login</option>
                      <option value="register">Register</option>
                      <option value="purchase">Purchase</option>
                      <option value="update_profile">Update</option>
                    </Form.Select>
                  </div>
                  {activityLogs.length === 0 ? (
                    <p className="text-center text-muted py-5 mb-0">No activity logged yet.</p>
                  ) : (
                    <div className="table-responsive">
                      <Table hover className="mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>User</th>
                            <th>Action</th>
                            <th>Description</th>
                            <th>Time</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(filterAction ? activityLogs.filter(l => l.action === filterAction) : activityLogs).map((log, i) => (
                            <React.Fragment key={i}>
                              <tr
                                className="cursor-pointer"
                                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                              >
                                <td>
                                  <div className="fw-semibold text-dark">{log.userName}</div>
                                  {log.userEmail && <div className="text-muted small">{log.userEmail}</div>}
                                </td>
                                <td>
                                  <Badge bg={getActionBadgeVariant(log.action)}>{log.action.toUpperCase()}</Badge>
                                </td>
                                <td>{log.description}</td>
                                <td className="text-muted small">{new Date(log.createdAt).toLocaleString()}</td>
                                <td>{log.details ? <span className="text-primary">🔍</span> : '—'}</td>
                              </tr>
                              {selectedLog?.id === log.id && (
                                <tr>
                                  <td colSpan="5" className="p-0 border-primary border-bottom border-2">
                                    <div className="bg-light p-3 border-start border-4 border-primary">
                                      <div className="d-flex justify-content-between align-items-center mb-2">
                                        <strong className="small text-dark">📄 Activity Details</strong>
                                        <Button variant="link" size="sm" className="text-muted p-0" onClick={() => setSelectedLog(null)}>✕</Button>
                                      </div>
                                      <Row className="g-2 small">
                                        <Col xs={3} className="text-muted">User:</Col>
                                        <Col xs={9}><strong>{selectedLog.userName}</strong> ({selectedLog.userEmail || 'no email'})</Col>
                                        <Col xs={3} className="text-muted">Action:</Col>
                                        <Col xs={9}>{selectedLog.action}</Col>
                                        <Col xs={3} className="text-muted">Time:</Col>
                                        <Col xs={9}>{new Date(selectedLog.createdAt).toLocaleString()}</Col>
                                        {selectedLog.entity && (
                                          <>
                                            <Col xs={3} className="text-muted">Entity:</Col>
                                            <Col xs={9}>{selectedLog.entity}{selectedLog.entityId ? ` #${selectedLog.entityId}` : ''}</Col>
                                          </>
                                        )}
                                        {selectedLog.details && (
                                          <>
                                            <Col xs={3} className="text-muted">Details:</Col>
                                            <Col xs={9}>
                                              <pre className="bg-white p-2 rounded small mb-0 overflow-auto">
                                                {JSON.stringify(selectedLog.details, null, 2)}
                                              </pre>
                                            </Col>
                                          </>
                                        )}
                                      </Row>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {activeTab === 'revenue' && (
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title className="h5 mb-4">💰 Revenue Analytics</Card.Title>
                  <SummaryCards cards={[
                    { value: formatCurrency(totalRevenue), label: 'Total Revenue (All Sources)', borderClass: 'border-success' },
                    { value: formatNumber(totalTicketsSold), label: 'Total Tickets Sold', borderClass: 'border-primary' },
                    { value: formatCurrency(totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0), label: 'Avg Revenue per Ticket', borderClass: 'border-danger' },
                  ]} />
                  <h3 className="h6 text-dark mb-3">Revenue by Match (Highest to Lowest)</h3>
                  <div className="d-flex flex-column gap-3 mb-4">
                    {mostProfitable.slice(0, 15).map((m, i) => {
                      const maxRev = Math.max(...mostProfitable.map(x => x.revenue), 1);
                      const barWidth = (m.revenue / maxRev) * 100;
                      return (
                        <Row key={i} className="align-items-center g-2">
                          <Col md={4} className="text-md-end fw-semibold small text-dark">{m.match}</Col>
                          <Col md={5}>
                            <ProgressBar now={Math.max(barWidth, 3)} variant="success" />
                          </Col>
                          <Col md={3}>
                            <span className="fw-bold small">{formatCurrency(m.revenue)}</span>
                            <span className="text-muted small ms-1">({m.ticketsSold} tickets)</span>
                          </Col>
                        </Row>
                      );
                    })}
                    {mostProfitable.length === 0 && (
                      <p className="text-center text-muted py-3 mb-0">No revenue data available yet</p>
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}

            {activeTab === 'dynamic' && (
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title className="h5 mb-4">🔧 Dynamic Report Generator</Card.Title>

                  <Row className="g-3 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">From Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={drForm.dateFrom}
                          onChange={(e) => setDrForm({...drForm, dateFrom: e.target.value})}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">To Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={drForm.dateTo}
                          onChange={(e) => setDrForm({...drForm, dateTo: e.target.value})}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">Metrics</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                      {[
                        { id: 'tickets_sold', label: 'Tickets Sold' }, { id: 'revenue', label: 'Revenue' },
                        { id: 'orders_count', label: 'Orders Count' }, { id: 'avg_order_value', label: 'Avg Order Value' },
                        { id: 'cancellations', label: 'Cancellations' }, { id: 'registrations', label: 'Registrations' },
                        { id: 'logins', label: 'Logins' },
                      ].map(m => (
                        <Button
                          key={m.id}
                          variant={drForm.metrics.includes(m.id) ? 'primary' : 'outline-secondary'}
                          size="sm"
                          onClick={() => setDrForm({
                            ...drForm,
                            metrics: drForm.metrics.includes(m.id)
                              ? drForm.metrics.filter(x => x !== m.id)
                              : [...drForm.metrics, m.id]
                          })}
                        >
                          {m.label}
                        </Button>
                      ))}
                    </div>
                  </Form.Group>

                  <Row className="g-3 mb-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">Group By</Form.Label>
                        <Form.Select value={drForm.groupBy} onChange={(e) => setDrForm({...drForm, groupBy: e.target.value})}>
                          <option value="none">Total</option>
                          <option value="match">By Match</option>
                          <option value="stadium">By Stadium</option>
                          <option value="day">By Day</option>
                          <option value="month">By Month</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-semibold">Status</Form.Label>
                        <Form.Select
                          value={drForm.filters.status || ''}
                          onChange={(e) => setDrForm({...drForm, filters: {...drForm.filters, status: e.target.value}})}
                        >
                          <option value="">All</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="pending">Pending</option>
                          <option value="cancelled">Cancelled</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button
                    variant="primary"
                    className="w-100 mb-4 fw-bold"
                    onClick={async () => {
                      setDrLoading(true);
                      try { const res = await api.post('/admin/reports/dynamic', drForm); setDynamicReport(res.data || res); } catch (e) { console.error(e); }
                      setDrLoading(false);
                    }}
                    disabled={drLoading}
                  >
                    {drLoading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Generating...
                      </>
                    ) : '🚀 Generate Report'}
                  </Button>

                  {dynamicReport && (() => {
                    const localData = localOrders.filter(o => o.status === 'confirmed' || o.status === 'completed');
                    const mergedRows = (dynamicReport.rows || []).map(r => ({ ...r }));
                    let mergedSummary = { ...(dynamicReport.summary || {}) };

                    if (dynamicReport.metrics?.includes('tickets_sold') || dynamicReport.metrics?.includes('revenue') || dynamicReport.metrics?.includes('orders_count')) {
                      const localTickets = localData.reduce((s, o) => s + (o.tickets || 0), 0);
                      const localRev = localData.reduce((s, o) => s + (o.total || 0), 0);
                      const localOrdersCount = localData.length;

                      if (drForm.groupBy === 'none') {
                        const totalRow = mergedRows.find(r => r.label === 'Total');
                        if (totalRow) {
                          totalRow.tickets_sold = (totalRow.tickets_sold || 0) + localTickets;
                          totalRow.revenue = (totalRow.revenue || 0) + localRev;
                          totalRow.orders_count = (totalRow.orders_count || 0) + localOrdersCount;
                        } else {
                          mergedRows.push({ label: 'Total', tickets_sold: localTickets, revenue: localRev, orders_count: localOrdersCount });
                        }
                        if (dynamicReport.metrics?.includes('tickets_sold')) mergedSummary.totalTickets = (mergedSummary.totalTickets || 0) + localTickets;
                        if (dynamicReport.metrics?.includes('revenue')) mergedSummary.totalRevenue = (mergedSummary.totalRevenue || 0) + localRev;
                        if (dynamicReport.metrics?.includes('orders_count')) mergedSummary.totalOrders = (mergedSummary.totalOrders || 0) + localOrdersCount;
                      } else {
                        mergedRows.push({
                          label: 'Local Orders (browser)',
                          tickets_sold: dynamicReport.metrics?.includes('tickets_sold') ? localTickets : undefined,
                          revenue: dynamicReport.metrics?.includes('revenue') ? localRev : undefined,
                          orders_count: dynamicReport.metrics?.includes('orders_count') ? localOrdersCount : undefined
                        });
                        if (dynamicReport.metrics?.includes('tickets_sold')) mergedSummary.totalTickets = (mergedSummary.totalTickets || 0) + localTickets;
                        if (dynamicReport.metrics?.includes('revenue')) mergedSummary.totalRevenue = (mergedSummary.totalRevenue || 0) + localRev;
                        if (dynamicReport.metrics?.includes('orders_count')) mergedSummary.totalOrders = (mergedSummary.totalOrders || 0) + localOrdersCount;
                      }
                    }

                    return (
                      <>
                        {Object.keys(mergedSummary).length > 0 && (
                          <Row className="g-3 mb-3">
                            {mergedSummary.totalTickets !== undefined && (
                              <Col xs={12} sm={6} md={4}>
                                <Card className="bg-info bg-opacity-10 text-center">
                                  <Card.Body className="py-3">
                                    <div className="fs-5 fw-bold">{mergedSummary.totalTickets}</div>
                                    <div className="text-muted small">Total Tickets</div>
                                  </Card.Body>
                                </Card>
                              </Col>
                            )}
                            {mergedSummary.totalRevenue !== undefined && (
                              <Col xs={12} sm={6} md={4}>
                                <Card className="bg-success bg-opacity-10 text-center">
                                  <Card.Body className="py-3">
                                    <div className="fs-5 fw-bold text-success">€{Number(mergedSummary.totalRevenue).toFixed(2)}</div>
                                    <div className="text-muted small">Total Revenue</div>
                                  </Card.Body>
                                </Card>
                              </Col>
                            )}
                            {mergedSummary.totalOrders !== undefined && (
                              <Col xs={12} sm={6} md={4}>
                                <Card className="bg-warning bg-opacity-10 text-center">
                                  <Card.Body className="py-3">
                                    <div className="fs-5 fw-bold text-warning">#{mergedSummary.totalOrders}</div>
                                    <div className="text-muted small">Total Orders</div>
                                  </Card.Body>
                                </Card>
                              </Col>
                            )}
                          </Row>
                        )}

                        <div className="table-responsive">
                          <Table hover className="mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                {drForm.groupBy !== 'none' && <th>Group</th>}
                                {dynamicReport.metrics?.includes('tickets_sold') && <th>Tickets Sold</th>}
                                {dynamicReport.metrics?.includes('revenue') && <th>Revenue (€)</th>}
                                {dynamicReport.metrics?.includes('orders_count') && <th>Orders</th>}
                                {dynamicReport.metrics?.includes('avg_order_value') && <th>Avg/Order</th>}
                                {dynamicReport.metrics?.includes('cancellations') && <th>Cancelled</th>}
                                {dynamicReport.metrics?.includes('registrations') && <th>Registrations</th>}
                                {dynamicReport.metrics?.includes('logins') && <th>Logins</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {mergedRows.map((row, i) => (
                                <tr key={i}>
                                  {drForm.groupBy !== 'none' && <td className="fw-semibold">{row.label}</td>}
                                  {dynamicReport.metrics?.includes('tickets_sold') && <td>{row.tickets_sold || 0}</td>}
                                  {dynamicReport.metrics?.includes('revenue') && <td>€{Number(row.revenue || 0).toFixed(2)}</td>}
                                  {dynamicReport.metrics?.includes('orders_count') && <td>{row.orders_count || 0}</td>}
                                  {dynamicReport.metrics?.includes('avg_order_value') && <td>€{Number(row.avg_order_value || 0).toFixed(2)}</td>}
                                  {dynamicReport.metrics?.includes('cancellations') && <td>{row.cancellations || 0}</td>}
                                  {dynamicReport.metrics?.includes('registrations') && <td>{row.registrations || 0}</td>}
                                  {dynamicReport.metrics?.includes('logins') && <td>{row.logins || 0}</td>}
                                </tr>
                              ))}
                              {mergedRows.length === 0 && (
                                <tr>
                                  <td colSpan="7" className="text-center text-muted py-4">No data</td>
                                </tr>
                              )}
                            </tbody>
                          </Table>
                        </div>

                        {mergedRows.length > 0 && (
                          <Button
                            variant="success"
                            className="mt-3"
                            onClick={() => {
                              const headers = dynamicReport.metrics;
                              const csv = [['Group', ...headers].join(','), ...mergedRows.map(r => [r.label || 'Total', ...headers.map(h => r[h] || 0)].join(','))].join('\n');
                              const blob = new Blob([csv], { type: 'text/csv' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a'); a.href = url; a.download = 'report.csv'; a.click();
                            }}
                          >
                            📥 Export CSV
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </Container>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = { scheduled: '#3498db', live: '#e74c3c', completed: '#2ecc71', cancelled: '#95a5a6', postponed: '#f39c12' };
  return colors[status] || '#95a5a6';
};

export default AdminReports;
