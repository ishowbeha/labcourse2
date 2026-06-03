import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import OrderService from '../services/OrderService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';

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

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/home');
      return;
    }
    const local = OrderService.getOrders();
    setLocalOrders(local);
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
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (!isAdmin()) return null;

  // Combine DB data with local orders
  const confirmedLocalOrders = localOrders.filter(o => o.status === 'confirmed' || o.status === 'completed');
  const localTicketsSold = confirmedLocalOrders.reduce((sum, o) => sum + (o.tickets || 0), 0);
  const localRevenue = confirmedLocalOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalTicketsSold = (ticketSales.reduce((sum, m) => sum + (m.sold_tickets || 0), 0)) + localTicketsSold;
  const totalRevenue = (ticketSales.reduce((sum, m) => sum + (m.total_revenue || 0), 0)) + localRevenue;

  // Build combined match list sorted by revenue descending
  const dbMatchesMap = {};
  ticketSales.forEach(m => {
    const key = `${m.home_team || ''} vs ${m.away_team || ''}`;
    dbMatchesMap[key] = {
      match: key,
      date: m.match_date,
      stadium: m.stadium_name || 'N/A',
      ticketsSold: m.sold_tickets || 0,
      totalTickets: m.total_tickets || 0,
      revenue: m.total_revenue || 0,
      basePrice: m.base_price || 0,
      status: m.match_status || 'scheduled'
    };
  });

  // Add local orders to the map
  confirmedLocalOrders.forEach(o => {
    const key = o.match || 'Unknown Match';
    if (dbMatchesMap[key]) {
      dbMatchesMap[key].ticketsSold += o.tickets || 0;
      dbMatchesMap[key].revenue += o.total || 0;
    } else {
      dbMatchesMap[key] = {
        match: key,
        date: o.matchDate,
        stadium: o.stadium || 'N/A',
        ticketsSold: o.tickets || 0,
        totalTickets: o.tickets || 0,
        revenue: o.total || 0,
        basePrice: Math.round((o.total || 0) / (o.tickets || 1)),
        status: 'confirmed'
      };
    }
  });

  // Only keep matches that have actual ticket sales (no empty/static matches)
  const allMatches = Object.values(dbMatchesMap).filter(m => m.ticketsSold > 0);
  const mostProfitable = [...allMatches].sort((a, b) => b.revenue - a.revenue);
  const topSelling = [...allMatches].sort((a, b) => b.ticketsSold - a.ticketsSold);

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard Overview' },
    { id: 'matches', label: '⚽ Match Sales (Most Profitable)' },
    { id: 'revenue', label: '💰 Revenue Analytics' },
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

        {/* Tabs */}
        <div style={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ ...styles.tab, ...(activeTab === tab.id ? styles.activeTab : {}) }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>Loading reports...</div>
        ) : (
          <>
            {/* Dashboard Overview Tab */}
            {activeTab === 'dashboard' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>📊 Analytics Dashboard</h2>
                
                {/* Summary Cards */}
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

                {/* Most Profitable Matches Table */}
                <h3 style={{ margin: '24px 0 12px', color: '#2c3e50' }}>🏆 Most Profitable (by Revenue)</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Match</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Tickets Sold</th>
                      <th style={styles.th}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostProfitable.slice(0, 20).map((m, i) => (
                      <tr key={i} style={i < 3 ? styles.topRow : {}}>
                        <td style={styles.td}>
                          {i < 3 ? (
                            <span style={styles.rankBadge}>{i + 1}</span>
                          ) : i + 1}
                        </td>
                        <td style={styles.td}><strong>{m.match}</strong></td>
                        <td style={styles.td}>{formatDate(m.date)}</td>
                        <td style={styles.td}><span style={styles.soldCount}>{m.ticketsSold}</span></td>
                        <td style={styles.td}><strong style={styles.revenueValue}>{formatCurrency(m.revenue)}</strong></td>
                      </tr>
                    ))}
                    {mostProfitable.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#95a5a6' }}>No sales data available yet</td></tr>
                    )}
                  </tbody>
                </table>

                {/* Top Selling (by quantity) */}
                <h3 style={{ margin: '24px 0 12px', color: '#2c3e50' }}>📈 Most Tickets Sold</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Match</th>
                      <th style={styles.th}>Tickets Sold</th>
                      <th style={styles.th}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSelling.slice(0, 20).map((m, i) => (
                      <tr key={i} style={i < 3 ? styles.topRow : {}}>
                        <td style={styles.td}>
                          {i < 3 ? <span style={styles.rankBadge}>{i + 1}</span> : i + 1}
                        </td>
                        <td style={styles.td}><strong>{m.match}</strong></td>
                        <td style={styles.td}><span style={styles.soldCount}>{m.ticketsSold}</span></td>
                        <td style={styles.td}><strong style={styles.revenueValue}>{formatCurrency(m.revenue)}</strong></td>
                      </tr>
                    ))}
                    {topSelling.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#95a5a6' }}>No sales data available yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Match Sales Tab - sorted by revenue descending */}
            {activeTab === 'matches' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>⚽ All Match Sales (Most Profitable First)</h2>
                
                {/* Summary stats */}
                <div style={styles.summaryCards}>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #27ae60' }}>
                    <span style={styles.summaryValue}>{formatNumber(totalTicketsSold)}</span>
                    <span style={styles.summaryLabel}>Total Tickets Sold</span>
                  </div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #3498db' }}>
                    <span style={styles.summaryValue}>{formatCurrency(totalRevenue)}</span>
                    <span style={styles.summaryLabel}>Total Revenue</span>
                  </div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #f39c12' }}>
                    <span style={styles.summaryValue}>{formatNumber(allMatches.length)}</span>
                    <span style={styles.summaryLabel}>Matches with Sales</span>
                  </div>
                </div>

                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Match</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Stadium</th>
                      <th style={styles.th}>Tickets Sold</th>
                      <th style={styles.th}>Available</th>
                      <th style={styles.th}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostProfitable.map((m, i) => (
                      <tr key={i} style={i < 3 ? styles.topRow : {}}>
                        <td style={styles.td}>
                          {i < 3 ? <span style={styles.rankBadge}>{i + 1}</span> : i + 1}
                        </td>
                        <td style={styles.td}><strong>{m.match}</strong></td>
                        <td style={styles.td}>{formatDate(m.date)}</td>
                        <td style={styles.td}>{m.stadium}</td>
                        <td style={styles.td}><span style={styles.soldCount}>{m.ticketsSold}</span></td>
                        <td style={styles.td}>{Math.max(0, (m.totalTickets || 600) - m.ticketsSold)}</td>
                        <td style={styles.td}><strong style={styles.revenueValue}>{formatCurrency(m.revenue)}</strong></td>
                      </tr>
                    ))}
                    {mostProfitable.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#95a5a6' }}>No sales data available yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Revenue Analytics Tab */}
            {activeTab === 'revenue' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>💰 Revenue Analytics</h2>
                
                <div style={styles.summaryCards}>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #27ae60' }}>
                    <span style={styles.summaryValue}>{formatCurrency(totalRevenue)}</span>
                    <span style={styles.summaryLabel}>Total Revenue (All Sources)</span>
                  </div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #3498db' }}>
                    <span style={styles.summaryValue}>{formatNumber(totalTicketsSold)}</span>
                    <span style={styles.summaryLabel}>Total Tickets Sold</span>
                  </div>
                  <div style={{ ...styles.summaryCard, borderTop: '4px solid #e74c3c' }}>
                    <span style={styles.summaryValue}>{formatCurrency(totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0)}</span>
                    <span style={styles.summaryLabel}>Avg Revenue per Ticket</span>
                  </div>
                </div>

                {/* Revenue Breakdown by Match */}
                <h3 style={{ margin: '24px 0 12px', color: '#2c3e50' }}>Revenue by Match (Highest to Lowest)</h3>
                <div style={styles.barChartVertical}>
                  {mostProfitable.slice(0, 15).map((m, i) => {
                    const maxRev = Math.max(...mostProfitable.map(x => x.revenue), 1);
                    const barWidth = (m.revenue / maxRev) * 100;
                    return (
                      <div key={i} style={styles.barRow}>
                        <span style={styles.barMatchLabel}>{m.match}</span>
                        <div style={styles.barTrack}>
                          <div style={{ ...styles.barFill, width: `${Math.max(barWidth, 3)}%` }} />
                        </div>
                        <div style={styles.barValues}>
                          <span style={styles.barRevenue}>{formatCurrency(m.revenue)}</span>
                          <span style={styles.barTickets}>({m.ticketsSold} tickets)</span>
                        </div>
                      </div>
                    );
                  })}
                  {mostProfitable.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>No revenue data available yet</p>
                  )}
                </div>

                {/* Summary Table */}
                <h3 style={{ margin: '24px 0 12px', color: '#2c3e50' }}>Match Summary</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Match</th>
                      <th style={styles.th}>Tickets Sold</th>
                      <th style={styles.th}>Revenue</th>
                      <th style={styles.th}>% of Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostProfitable.map((m, i) => {
                      const pct = totalRevenue > 0 ? ((m.revenue / totalRevenue) * 100).toFixed(1) : 0;
                      return (
                        <tr key={i}>
                          <td style={styles.td}><strong>{m.match}</strong></td>
                          <td style={styles.td}>{m.ticketsSold}</td>
                          <td style={styles.td}><strong style={styles.revenueValue}>{formatCurrency(m.revenue)}</strong></td>
                          <td style={styles.td}>
                            <div style={styles.pctBar}>
                              <div style={{ ...styles.pctFill, width: `${Math.min(pct, 100)}%` }} />
                              <span style={styles.pctText}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {mostProfitable.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#95a5a6' }}>No data available</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    scheduled: '#3498db', live: '#e74c3c', completed: '#2ecc71',
    cancelled: '#95a5a6', postponed: '#f39c12'
  };
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
  // Bar chart
  barChartVertical: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  barRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  barMatchLabel: { minWidth: '180px', fontSize: '13px', fontWeight: '600', color: '#2c3e50', textAlign: 'right' },
  barTrack: { flex: 1, height: '24px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: '4px', transition: 'width 0.5s', minWidth: '8px' },
  barValues: { minWidth: '180px', display: 'flex', gap: '8px', alignItems: 'center' },
  barRevenue: { fontSize: '14px', fontWeight: '700', color: '#2c3e50' },
  barTickets: { fontSize: '12px', color: '#7f8c8d' },
  // Percentage bar
  pctBar: { position: 'relative', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', minWidth: '120px' },
  pctFill: { height: '100%', backgroundColor: '#3498db', borderRadius: '10px' },
  pctText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '11px', fontWeight: '600', color: '#2c3e50' },
};

const responsiveStyles = {
  mobile: {
    main: { ...styles.main, padding: '20px 15px' },
    summaryCards: { ...styles.summaryCards, gridTemplateColumns: '1fr' },
    barMatchLabel: { minWidth: '100px', fontSize: '11px' },
    barValues: { minWidth: '120px' },
  },
  tablet: {
    main: { ...styles.main, padding: '30px 15px' },
    summaryCards: { ...styles.summaryCards, gridTemplateColumns: 'repeat(3, 1fr)' },
  }
};

export default AdminReports;