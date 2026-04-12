import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';

const AdminReports = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const screenSize = useResponsiveStyles();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading] = useState(true);
  const [ticketSales, setTicketSales] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [topMatches, setTopMatches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/home');
      return;
    }
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

      if (salesRes.success) setTicketSales(salesRes.data);
      if (revenueRes.success) setRevenueData(revenueRes.data);
      if (topRes.success) setTopMatches(topRes.data);
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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isAdmin()) {
    return null;
  }

  const tabs = [
    { id: 'sales', label: '🎫 Ticket Sales by Match' },
    { id: 'revenue', label: '💰 Revenue Analytics' },
    { id: 'top', label: '🏆 Top Selling Matches' }
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
            <span style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </span>
            <span style={styles.userRole}>Administrator</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
            
            {/* Hamburger Menu Button for Mobile */}
            <button 
              className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`} 
              onClick={toggleMobileMenu}
              style={screenSize === 'mobile' ? styles.hamburgerBtn : { display: 'none' }}
              aria-label="Toggle admin menu"
            >
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Admin Menu Overlay */}
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

      <main style={screenSize === 'mobile' ? responsiveStyles.mobile.main : screenSize === 'tablet' ? responsiveStyles.tablet.main : styles.main}>
        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Tabs */}
        <div style={screenSize === 'mobile' ? responsiveStyles.mobile.tabs : styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.activeTab : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>Loading reports...</div>
        ) : (
          <>
            {/* Ticket Sales Tab */}
            {activeTab === 'sales' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>Ticket Sales by Match</h2>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Match</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Stadium</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Base Price</th>
                      <th style={styles.th}>Total Tickets</th>
                      <th style={styles.th}>Sold</th>
                      <th style={styles.th}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketSales.map(match => (
                      <tr key={match.id}>
                        <td style={styles.td}>
                          <strong>{match.home_team}</strong> vs <strong>{match.away_team}</strong>
                        </td>
                        <td style={styles.td}>{formatDate(match.match_date)}</td>
                        <td style={styles.td}>{match.stadium_name || 'N/A'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: getStatusColor(match.match_status)
                          }}>
                            {match.match_status}
                          </span>
                        </td>
                        <td style={styles.td}>{formatCurrency(match.base_price)}</td>
                        <td style={styles.td}>{match.total_tickets || 0}</td>
                        <td style={styles.td}>
                          <span style={styles.soldCount}>{match.sold_tickets || 0}</span>
                        </td>
                        <td style={styles.td}>
                          <strong style={styles.revenueValue}>{formatCurrency(match.total_revenue)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ticketSales.length === 0 && (
                  <p style={styles.noData}>No ticket sales data available</p>
                )}
              </div>
            )}

            {/* Revenue Analytics Tab */}
            {activeTab === 'revenue' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>Revenue Analytics (Monthly)</h2>
                
                {/* Summary Cards */}
                <div style={screenSize === 'mobile' ? responsiveStyles.mobile.summaryCards : screenSize === 'tablet' ? responsiveStyles.tablet.summaryCards : styles.summaryCards}>
                  <div style={styles.summaryCard}>
                    <span style={styles.summaryLabel}>Total Revenue</span>
                    <span style={styles.summaryValue}>
                      {formatCurrency(revenueData.reduce((sum, r) => sum + r.revenue, 0))}
                    </span>
                  </div>
                  <div style={styles.summaryCard}>
                    <span style={styles.summaryLabel}>Total Orders</span>
                    <span style={styles.summaryValue}>
                      {revenueData.reduce((sum, r) => sum + r.order_count, 0)}
                    </span>
                  </div>
                  <div style={styles.summaryCard}>
                    <span style={styles.summaryLabel}>Avg Order Value</span>
                    <span style={styles.summaryValue}>
                      {formatCurrency(
                        revenueData.reduce((sum, r) => sum + r.revenue, 0) /
                        Math.max(revenueData.reduce((sum, r) => sum + r.order_count, 0), 1)
                      )}
                    </span>
                  </div>
                </div>

                  {/* Revenue Chart (Simple Bar Chart) */}
                <div style={screenSize === 'mobile' ? responsiveStyles.mobile.chartContainer : styles.chartContainer}>
                  <h3 style={styles.chartTitle}>Monthly Revenue Trend</h3>
                  <div style={screenSize === 'mobile' ? responsiveStyles.mobile.barChart : styles.barChart}>
                    {revenueData.slice().reverse().map((data, index) => {
                      const maxRevenue = Math.max(...revenueData.map(r => r.revenue), 1);
                      const barHeight = (data.revenue / maxRevenue) * 100;
                      return (
                        <div key={data.period} style={styles.barItem}>
                          <div style={styles.barWrapper}>
                            <div
                              style={{
                                ...styles.bar,
                                height: `${barHeight}%`
                              }}
                            />
                          </div>
                          <span style={styles.barLabel}>{data.period}</span>
                          <span style={styles.barValue}>{formatCurrency(data.revenue)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Revenue Table */}
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Period</th>
                      <th style={styles.th}>Orders</th>
                      <th style={styles.th}>Revenue</th>
                      <th style={styles.th}>Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.map(data => (
                      <tr key={data.period}>
                        <td style={styles.td}>{data.period}</td>
                        <td style={styles.td}>{data.order_count}</td>
                        <td style={styles.td}>{formatCurrency(data.revenue)}</td>
                        <td style={styles.td}>{formatCurrency(data.avg_order_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {revenueData.length === 0 && (
                  <p style={styles.noData}>No revenue data available</p>
                )}
              </div>
            )}

            {/* Top Selling Matches Tab */}
            {activeTab === 'top' && (
              <div style={styles.reportSection}>
                <h2 style={styles.reportTitle}>Top Selling Matches</h2>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Match</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Stadium</th>
                      <th style={styles.th}>Tickets Sold</th>
                      <th style={styles.th}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMatches.map((match, index) => (
                      <tr key={match.id} style={index < 3 ? styles.topRow : {}}>
                        <td style={styles.td}>
                          {index < 3 ? (
                            <span style={styles.rankBadge}>{index + 1}</span>
                          ) : (
                            index + 1
                          )}
                        </td>
                        <td style={styles.td}>
                          <strong>{match.home_team}</strong> vs <strong>{match.away_team}</strong>
                        </td>
                        <td style={styles.td}>{formatDate(match.match_date)}</td>
                        <td style={styles.td}>{match.stadium_name || 'N/A'}</td>
                        <td style={styles.td}>
                          <span style={styles.soldCount}>{match.tickets_sold || 0}</span>
                        </td>
                        <td style={styles.td}>
                          <strong style={styles.revenueValue}>{formatCurrency(match.total_revenue)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topMatches.length === 0 && (
                  <p style={styles.noData}>No data available</p>
                )}
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
    scheduled: '#3498db',
    live: '#e74c3c',
    completed: '#2ecc71',
    cancelled: '#95a5a6',
    postponed: '#f39c12'
  };
  return colors[status] || '#95a5a6';
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px 0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: '0',
    fontSize: '24px',
  },
  backLink: {
    color: '#bdc3c7',
    textDecoration: 'none',
    fontSize: '14px',
    marginTop: '4px',
    display: 'inline-block',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    fontWeight: '600',
  },
  userRole: {
    backgroundColor: '#3498db',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid white',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #eee',
    paddingBottom: '12px',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: '#3498db',
    color: 'white',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#555',
  },
  reportSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  reportTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    color: '#2c3e50',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    fontWeight: '600',
    fontSize: '13px',
    color: '#555',
    borderBottom: '2px solid #eee',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    borderBottom: '1px solid #eee',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'white',
    textTransform: 'capitalize',
  },
  soldCount: {
    fontWeight: '600',
    color: '#3498db',
  },
  revenueValue: {
    color: '#27ae60',
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#95a5a6',
    fontSize: '16px',
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  summaryLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#555',
    marginBottom: '8px',
  },
  summaryValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#2c3e50',
  },
  chartContainer: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  chartTitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    color: '#555',
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '200px',
    gap: '10px',
  },
  barItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    width: '40px',
    height: '150px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px 4px 0 0',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: '#3498db',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s',
  },
  barLabel: {
    marginTop: '8px',
    fontSize: '11px',
    color: '#555',
  },
  barValue: {
    fontSize: '10px',
    color: '#27ae60',
    fontWeight: '600',
    marginTop: '2px',
  },
  topRow: {
    backgroundColor: '#f8f9fa',
  },
  rankBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#f39c12',
    color: 'white',
    fontWeight: '700',
    fontSize: '12px',
  },
  hamburgerBtn: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '5px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '5px',
    zIndex: 1001,
  },
  hamburgerLine: {
    width: '25px',
    height: '3px',
    backgroundColor: 'white',
    borderRadius: '2px',
    transition: 'transform 0.3s, opacity 0.3s',
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  mobileMenu: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '280px',
    height: '100%',
    backgroundColor: '#2c3e50',
    zIndex: 1000,
    padding: '20px',
    boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.2)',
    overflowY: 'auto',
  },
  mobileMenuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  mobileUserName: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
  },
  mobileLogoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  mobileNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  mobileNavLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '16px',
    padding: '12px 16px',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
};

// Responsive styles
const responsiveStyles = {
  mobile: {
    main: {
      ...styles.main,
      padding: '20px 15px',
    },
    tabs: {
      ...styles.tabs,
      flexDirection: 'column',
      gap: '4px',
    },
    tab: {
      ...styles.tab,
      borderRadius: '8px',
      textAlign: 'left',
    },
    summaryCards: {
      ...styles.summaryCards,
      gridTemplateColumns: '1fr',
    },
    chartContainer: {
      ...styles.chartContainer,
      padding: '12px',
    },
    barChart: {
      ...styles.barChart,
      height: '150px',
      gap: '4px',
    },
    barWrapper: {
      ...styles.barWrapper,
      width: '20px',
      height: '100px',
    },
  },
  tablet: {
    main: {
      ...styles.main,
      padding: '30px 15px',
    },
    summaryCards: {
      ...styles.summaryCards,
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
  }
};

export default AdminReports;
