import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import OrderService from '../services/OrderService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';
import api from '../services/api';
import axios from 'axios';

const AdminReports = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
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
    // Also fetch backend orders
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

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>📊 Reports & Analytics</h1>
            <Link to="/admin" style={styles.backLink}>← Back to Dashboard</Link>
          </div>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.first_name} {user?.last_name}</span>
            <span style={styles.userRole}>Administrator</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
            <button onClick={toggleMobileMenu} style={screenSize === 'mobile' ? styles.hamburgerBtn : { display: 'none' }}>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
            </button>
          </div>
        </div>
      </header>

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

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : styles.main}>
        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.tabs}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...styles.tab, ...(activeTab === tab.id ? styles.activeTab : {}) }}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? <div style={styles.loading}>Loading reports...</div> : (
          <>
            {activeTab === 'dashboard' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>📊 Analytics Dashboard</h2>
                <div style={styles.summaryCards}>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #e74c3c' }}>
                    <span style={styles.summaryValue}>{formatNumber(totalTicketsSold)}</span>
                    <span style={styles.summaryLabel}>Total Tickets Sold</span>
                  </div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #27ae60' }}>
                    <span style={styles.summaryValue}>{formatCurrency(totalRevenue)}</span>
                    <span style={styles.summaryLabel}>Total Revenue</span>
                  </div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #3498db' }}>
                    <span style={styles.summaryValue}>{formatNumber(allMatches.length)}</span>
                    <span style={styles.summaryLabel}>Total Matches with Sales</span>
                  </div>
                </div>
                <h3 style={{ margin: '24px 0 12px', color: '#2c3e50' }}>🏆 Most Profitable (by Revenue)</h3>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>#</th><th style={styles.th}>Match</th><th style={styles.th}>Date</th><th style={styles.th}>Tickets Sold</th><th style={styles.th}>Revenue</th></tr></thead>
                  <tbody>
                    {mostProfitable.slice(0, 20).map((m, i) => (
                      <tr key={i} style={i < 3 ? styles.topRow : {}}>
                        <td style={styles.td}>{i < 3 ? <span style={styles.rankBadge}>{i + 1}</span> : i + 1}</td>
                        <td style={styles.td}><strong>{m.match}</strong></td>
                        <td style={styles.td}>{formatDate(m.date)}</td>
                        <td style={styles.td}><span style={styles.soldCount}>{m.ticketsSold}</span></td>
                        <td style={styles.td}><strong style={styles.revenueValue}>{formatCurrency(m.revenue)}</strong></td>
                      </tr>
                    ))}
                    {mostProfitable.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#95a5a6' }}>No sales data available yet</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'matches' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>⚽ All Match Sales (Most Profitable First)</h2>
                <div style={styles.summaryCards}>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #27ae60' }}><span style={styles.summaryValue}>{formatNumber(totalTicketsSold)}</span><span style={styles.summaryLabel}>Total Tickets Sold</span></div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #3498db' }}><span style={styles.summaryValue}>{formatCurrency(totalRevenue)}</span><span style={styles.summaryLabel}>Total Revenue</span></div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #f39c12' }}><span style={styles.summaryValue}>{formatNumber(allMatches.length)}</span><span style={styles.summaryLabel}>Matches with Sales</span></div>
                </div>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>#</th><th style={styles.th}>Match</th><th style={styles.th}>Date</th><th style={styles.th}>Stadium</th><th style={styles.th}>Tickets Sold</th><th style={styles.th}>Available</th><th style={styles.th}>Revenue</th></tr></thead>
                  <tbody>
                    {mostProfitable.map((m, i) => (
                      <tr key={i} style={i < 3 ? styles.topRow : {}}>
                        <td style={styles.td}>{i < 3 ? <span style={styles.rankBadge}>{i + 1}</span> : i + 1}</td>
                        <td style={styles.td}><strong>{m.match}</strong></td>
                        <td style={styles.td}>{formatDate(m.date)}</td>
                        <td style={styles.td}>{m.stadium}</td>
                        <td style={styles.td}><span style={styles.soldCount}>{m.ticketsSold}</span></td>
                        <td style={styles.td}>{Math.max(0, (m.totalTickets || 600) - m.ticketsSold)}</td>
                        <td style={styles.td}><strong style={styles.revenueValue}>{formatCurrency(m.revenue)}</strong></td>
                      </tr>
                    ))}
                    {mostProfitable.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#95a5a6' }}>No sales data available yet</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'activity' && (
              <div style={styles.reportSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>📋 User Activity Log</h2>
                  <select style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', minWidth: '150px' }}
                    value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                    <option value="">All Actions</option>
                    <option value="login">Login</option><option value="register">Register</option><option value="purchase">Purchase</option><option value="update_profile">Update</option>
                  </select>
                </div>
                {activityLogs.length === 0 ? <p style={{ textAlign: 'center', padding: '40px', color: '#95a5a6' }}>No activity logged yet.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead><tr><th style={styles.th}>User</th><th style={styles.th}>Action</th><th style={styles.th}>Description</th><th style={styles.th}>Time</th><th style={styles.th}></th></tr></thead>
                      <tbody>
                        {(filterAction ? activityLogs.filter(l => l.action === filterAction) : activityLogs).map((log, i) => (
                          <React.Fragment key={i}>
                            <tr style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}>
                              <td style={{ ...styles.td, fontSize: '13px' }}><div style={{ fontWeight: 600, color: '#2c3e50' }}>{log.userName}</div>{log.userEmail && <div style={{ color: '#6b7280', fontSize: '11px' }}>{log.userEmail}</div>}</td>
                              <td style={styles.td}><span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', display: 'inline-block', backgroundColor: log.action === 'login' ? '#dbeafe' : log.action === 'purchase' ? '#d1fae5' : log.action === 'register' ? '#e0e7ff' : '#f3e8ff', color: log.action === 'login' ? '#1d4ed8' : log.action === 'purchase' ? '#047857' : log.action === 'register' ? '#4338ca' : '#7c3aed' }}>{log.action.toUpperCase()}</span></td>
                              <td style={styles.td}>{log.description}</td>
                              <td style={{ ...styles.td, color: '#6b7280', fontSize: '13px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                              <td style={styles.td}>{log.details ? <span style={{ color: '#3498db' }}>🔍</span> : '—'}</td>
                            </tr>
                            {selectedLog?.id === log.id && (
                              <tr>
                                <td colSpan="5" style={{ padding: '0', borderBottom: '2px solid #3498db' }}>
                                  <div style={{ backgroundColor: '#f0f4f8', padding: '16px 20px', borderLeft: '4px solid #3498db' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                      <strong style={{ color: '#2c3e50', fontSize: '14px' }}>📄 Activity Details</strong>
                                      <span onClick={() => setSelectedLog(null)} style={{ cursor: 'pointer', color: '#999', fontSize: '16px' }}>✕</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px 12px', fontSize: '13px' }}>
                                      <span style={{ color: '#7f8c8d' }}>User:</span><span><strong>{selectedLog.userName}</strong> ({selectedLog.userEmail || 'no email'})</span>
                                      <span style={{ color: '#7f8c8d' }}>Action:</span><span>{selectedLog.action}</span>
                                      <span style={{ color: '#7f8c8d' }}>Time:</span><span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                                      {selectedLog.entity && <><span style={{ color: '#7f8c8d' }}>Entity:</span><span>{selectedLog.entity}{selectedLog.entityId ? ` #${selectedLog.entityId}` : ''}</span></>}
                                      {selectedLog.details && (
                                        <><span style={{ color: '#7f8c8d' }}>Details:</span>
                                          <pre style={{ margin: 0, fontSize: '11px', backgroundColor: 'white', padding: '8px', borderRadius: '4px', overflowX: 'auto', maxHeight: '150px' }}>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'revenue' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>💰 Revenue Analytics</h2>
                <div style={styles.summaryCards}>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #27ae60' }}><span style={styles.summaryValue}>{formatCurrency(totalRevenue)}</span><span style={styles.summaryLabel}>Total Revenue (All Sources)</span></div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #3498db' }}><span style={styles.summaryValue}>{formatNumber(totalTicketsSold)}</span><span style={styles.summaryLabel}>Total Tickets Sold</span></div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #e74c3c' }}><span style={styles.summaryValue}>{formatCurrency(totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0)}</span><span style={styles.summaryLabel}>Avg Revenue per Ticket</span></div>
                </div>
                <h3 style={{ margin: '24px 0 12px', color: '#2c3e50' }}>Revenue by Match (Highest to Lowest)</h3>
                <div style={styles.barChartVertical}>
                  {mostProfitable.slice(0, 15).map((m, i) => {
                    const maxRev = Math.max(...mostProfitable.map(x => x.revenue), 1);
                    const barWidth = (m.revenue / maxRev) * 100;
                    return (
                      <div key={i} style={styles.barRow}>
                        <span style={styles.barMatchLabel}>{m.match}</span>
                        <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${Math.max(barWidth, 3)}%` }} /></div>
                        <div style={styles.barValues}><span style={styles.barRevenue}>{formatCurrency(m.revenue)}</span><span style={styles.barTickets}>({m.ticketsSold} tickets)</span></div>
                      </div>
                    );
                  })}
                  {mostProfitable.length === 0 && <p style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>No revenue data available yet</p>}
                </div>
              </div>
            )}

            {activeTab === 'dynamic' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>🔧 Dynamic Report Generator</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>From Date</label>
                    <input type="date" value={drForm.dateFrom} onChange={(e) => setDrForm({...drForm, dateFrom: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>To Date</label>
                    <input type="date" value={drForm.dateTo} onChange={(e) => setDrForm({...drForm, dateTo: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '8px' }}>Metrics</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { id: 'tickets_sold', label: 'Tickets Sold' }, { id: 'revenue', label: 'Revenue' },
                      { id: 'orders_count', label: 'Orders Count' }, { id: 'avg_order_value', label: 'Avg Order Value' },
                      { id: 'cancellations', label: 'Cancellations' }, { id: 'registrations', label: 'Registrations' },
                      { id: 'logins', label: 'Logins' },
                    ].map(m => (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: drForm.metrics.includes(m.id) ? '#3498db' : '#f0f0f0', color: drForm.metrics.includes(m.id) ? 'white' : '#333', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="checkbox" checked={drForm.metrics.includes(m.id)}
                          onChange={() => setDrForm({...drForm, metrics: drForm.metrics.includes(m.id) ? drForm.metrics.filter(x => x !== m.id) : [...drForm.metrics, m.id] })}
                          style={{ display: 'none' }} />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>Group By</label>
                    <select value={drForm.groupBy} onChange={(e) => setDrForm({...drForm, groupBy: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                      <option value="none">Total</option><option value="match">By Match</option><option value="stadium">By Stadium</option><option value="day">By Day</option><option value="month">By Month</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#2c3e50', marginBottom: '4px' }}>Status</label>
                    <select value={drForm.filters.status || ''} onChange={(e) => setDrForm({...drForm, filters: {...drForm.filters, status: e.target.value}})}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
                      <option value="">All</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <button onClick={async () => {
                  setDrLoading(true);
                  try { const res = await api.post('/admin/reports/dynamic', drForm); setDynamicReport(res.data || res); } catch (e) { console.error(e); }
                  setDrLoading(false);
                }} style={{ width: '100%', padding: '14px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginBottom: '20px' }}>
                  {drLoading ? '⏳ Generating...' : '🚀 Generate Report'}
                </button>

                {dynamicReport && (() => {
                  // Merge local orders into the report data
                  const localData = localOrders.filter(o => o.status === 'confirmed' || o.status === 'completed');
                  const mergedRows = (dynamicReport.rows || []).map(r => ({ ...r }));
                  let mergedSummary = { ...(dynamicReport.summary || {}) };

                  // Add local order totals to summary
                  if (dynamicReport.metrics?.includes('tickets_sold') || dynamicReport.metrics?.includes('revenue') || dynamicReport.metrics?.includes('orders_count')) {
                    const localTickets = localData.reduce((s, o) => s + (o.tickets || 0), 0);
                    const localRev = localData.reduce((s, o) => s + (o.total || 0), 0);
                    const localOrdersCount = localData.length;

                    // If no grouping, add a "Local" row or just add to existing total
                    if (drForm.groupBy === 'none') {
                      const totalRow = mergedRows.find(r => r.label === 'Total');
                      if (totalRow) {
                        totalRow.tickets_sold = (totalRow.tickets_sold || 0) + localTickets;
                        totalRow.revenue = (totalRow.revenue || 0) + localRev;
                        totalRow.orders_count = (totalRow.orders_count || 0) + localOrdersCount;
                      } else {
                        mergedRows.push({ label: 'Total', tickets_sold: localTickets, revenue: localRev, orders_count: localOrdersCount });
                      }
                      // Update summary
                      if (dynamicReport.metrics?.includes('tickets_sold')) mergedSummary.totalTickets = (mergedSummary.totalTickets || 0) + localTickets;
                      if (dynamicReport.metrics?.includes('revenue')) mergedSummary.totalRevenue = (mergedSummary.totalRevenue || 0) + localRev;
                      if (dynamicReport.metrics?.includes('orders_count')) mergedSummary.totalOrders = (mergedSummary.totalOrders || 0) + localOrdersCount;
                    } else {
                      // GroupBy mode: group all local orders as "Local Orders"
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
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {mergedSummary.totalTickets !== undefined && (
                          <div style={{ flex: 1, minWidth: '150px', padding: '16px', backgroundColor: '#e8f4fd', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: '#2c3e50' }}>{mergedSummary.totalTickets}</div>
                            <div style={{ fontSize: '13px', color: '#555' }}>Total Tickets</div>
                          </div>
                        )}
                        {mergedSummary.totalRevenue !== undefined && (
                          <div style={{ flex: 1, minWidth: '150px', padding: '16px', backgroundColor: '#d1fae5', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: '#047857' }}>€{Number(mergedSummary.totalRevenue).toFixed(2)}</div>
                            <div style={{ fontSize: '13px', color: '#555' }}>Total Revenue</div>
                          </div>
                        )}
                        {mergedSummary.totalOrders !== undefined && (
                          <div style={{ flex: 1, minWidth: '150px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: '#92400e' }}>{mergedSummary.totalOrders}</div>
                            <div style={{ fontSize: '13px', color: '#555' }}>Total Orders</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                      <table style={styles.table}>
                        <thead><tr>
                          {drForm.groupBy !== 'none' && <th style={styles.th}>Group</th>}
                          {dynamicReport.metrics?.includes('tickets_sold') && <th style={styles.th}>Tickets Sold</th>}
                          {dynamicReport.metrics?.includes('revenue') && <th style={styles.th}>Revenue (€)</th>}
                          {dynamicReport.metrics?.includes('orders_count') && <th style={styles.th}>Orders</th>}
                          {dynamicReport.metrics?.includes('avg_order_value') && <th style={styles.th}>Avg/Order</th>}
                          {dynamicReport.metrics?.includes('cancellations') && <th style={styles.th}>Cancelled</th>}
                          {dynamicReport.metrics?.includes('registrations') && <th style={styles.th}>Registrations</th>}
                          {dynamicReport.metrics?.includes('logins') && <th style={styles.th}>Logins</th>}
                        </tr></thead>
                        <tbody>
                          {mergedRows.map((row, i) => (
                            <tr key={i}>
                              {drForm.groupBy !== 'none' && <td style={{ ...styles.td, fontWeight: 600 }}>{row.label}</td>}
                              {dynamicReport.metrics?.includes('tickets_sold') && <td style={styles.td}>{row.tickets_sold || 0}</td>}
                              {dynamicReport.metrics?.includes('revenue') && <td style={styles.td}>€{Number(row.revenue || 0).toFixed(2)}</td>}
                              {dynamicReport.metrics?.includes('orders_count') && <td style={styles.td}>{row.orders_count || 0}</td>}
                              {dynamicReport.metrics?.includes('avg_order_value') && <td style={styles.td}>€{Number(row.avg_order_value || 0).toFixed(2)}</td>}
                              {dynamicReport.metrics?.includes('cancellations') && <td style={styles.td}>{row.cancellations || 0}</td>}
                              {dynamicReport.metrics?.includes('registrations') && <td style={styles.td}>{row.registrations || 0}</td>}
                              {dynamicReport.metrics?.includes('logins') && <td style={styles.td}>{row.logins || 0}</td>}
                            </tr>
                          ))}
                          {mergedRows.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#95a5a6' }}>No data</td></tr>}
                        </tbody>
                      </table>
                    </div>

                    {mergedRows.length > 0 && (
                      <button onClick={() => {
                        const headers = dynamicReport.metrics;
                        const csv = [['Group', ...headers].join(','), ...mergedRows.map(r => [r.label || 'Total', ...headers.map(h => r[h] || 0)].join(','))].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'report.csv'; a.click();
                      }} style={{ marginTop: '16px', padding: '10px 24px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                        📥 Export CSV
                      </button>
                    )}
                  </>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = { scheduled: '#3498db', live: '#e74c3c', completed: '#2ecc71', cancelled: '#95a5a6', postponed: '#f39c12' };
  return colors[status] || '#95a5a6';
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#2c3e50', color: 'white', padding: '20px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: '0', fontSize: '24px' },
  backLink: { color: '#bdc3c7', textDecoration: 'none', fontSize: '14px', marginTop: '4px', display: 'inline-block' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  userName: { fontWeight: '600' },
  userRole: { backgroundColor: '#3498db', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' },
  logoutBtn: { backgroundColor: 'transparent', border: '1px solid white', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  hamburgerBtn: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', zIndex: 1001 },
  hamburgerLine: { width: '25px', height: '3px', backgroundColor: 'white', borderRadius: '2px' },
  mobileOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999 },
  mobileMenu: { position: 'fixed', top: 0, right: 0, width: '280px', height: '100%', backgroundColor: '#2c3e50', zIndex: 1000, padding: '20px', boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.2)', overflowY: 'auto' },
  mobileMenuHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
  mobileUserName: { color: 'white', fontSize: '16px', fontWeight: '600' },
  mobileLogoutBtn: { backgroundColor: 'transparent', border: '1px solid rgba(255, 255, 255, 0.3)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  mobileNav: { display: 'flex', flexDirection: 'column', gap: '10px' },
  mobileNavLink: { color: 'white', textDecoration: 'none', fontSize: '16px', padding: '12px 16px', borderRadius: '8px' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' },
  errorBanner: { backgroundColor: '#fee2e2', border: '1px solid #ef4444', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #eee', paddingBottom: '12px', flexWrap: 'wrap' },
  tab: { padding: '12px 20px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#555' },
  activeTab: { backgroundColor: '#3498db', color: 'white' },
  loading: { textAlign: 'center', padding: '40px', color: '#555' },
  reportSection: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  reportTitle: { margin: '0 0 20px 0', fontSize: '20px', color: '#2c3e50' },
  summaryCards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' },
  summaryCard: { backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' },
  summaryLabel: { display: 'block', fontSize: '13px', color: '#555', marginTop: '8px' },
  summaryValue: { display: 'block', fontSize: '24px', fontWeight: '700', color: '#2c3e50' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', backgroundColor: '#f8f9fa', fontWeight: '600', fontSize: '13px', color: '#555', borderBottom: '2px solid #eee' },
  td: { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid #eee' },
  soldCount: { fontWeight: '600', color: '#3498db' },
  revenueValue: { color: '#27ae60' },
  topRow: { backgroundColor: '#f8f9fa' },
  rankBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#f39c12', color: 'white', fontWeight: '700', fontSize: '12px' },
  barChartVertical: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  barRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  barMatchLabel: { minWidth: '180px', fontSize: '13px', fontWeight: '600', color: '#2c3e50', textAlign: 'right' },
  barTrack: { flex: 1, height: '24px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: '4px', transition: 'width 0.5s', minWidth: '8px' },
  barValues: { minWidth: '180px', display: 'flex', gap: '8px', alignItems: 'center' },
  barRevenue: { fontSize: '14px', fontWeight: '700', color: '#2c3e50' },
  barTickets: { fontSize: '12px', color: '#7f8c8d' },
  pctBar: { position: 'relative', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', minWidth: '120px' },
  pctFill: { height: '100%', backgroundColor: '#3498db', borderRadius: '10px' },
  pctText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '11px', fontWeight: '600', color: '#2c3e50' },
};

const responsiveStyles = {
  mobile: { main: { ...styles.main, padding: '20px 15px' }, summaryCards: { ...styles.summaryCards, gridTemplateColumns: '1fr' }, barMatchLabel: { minWidth: '100px', fontSize: '11px' }, barValues: { minWidth: '120px' } },
  tablet: { main: { ...styles.main, padding: '30px 15px' }, summaryCards: { ...styles.summaryCards, gridTemplateColumns: 'repeat(3, 1fr)' } }
};

export default AdminReports;