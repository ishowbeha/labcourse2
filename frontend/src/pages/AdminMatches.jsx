import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';

const AdminMatches = () => {
  const screenSize = useResponsiveStyles();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Match list state
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [matchFormData, setMatchFormData] = useState({
    homeTeam: '',
    awayTeam: '',
    stadiumId: '',
    matchDate: '',
    matchTime: '',
    competition: '',
    round: '',
    status: 'scheduled',
    basePrice: '',
    maxTicketsPerUser: 4,
    saleStartDate: '',
    saleEndDate: '',
    homeScore: 0,
    awayScore: 0
  });

  // Detail view state
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Stadiums for dropdown
  const [stadiums, setStadiums] = useState([]);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/home');
      return;
    }
    fetchMatches();
  }, [pagination.page, statusFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    // Load stadiums when modal opens
    if (showMatchModal && stadiums.length === 0) {
      fetchStadiums();
    }
  }, [showMatchModal]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getAdminMatches({
        page: pagination.page,
        limit: pagination.limit,
        search,
        status: statusFilter,
        dateFrom,
        dateTo
      });
      if (response.success && response.data) {
        setMatches(response.data.matches || []);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        });
      }
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError('Failed to load matches: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStadiums = async () => {
    try {
      const response = await AdminService.getStadiums({ limit: 100 });
      if (response.success && response.data) {
        setStadiums(response.data.stadiums || []);
      }
    } catch (err) {
      console.error('Failed to fetch stadiums:', err);
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

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination({ ...pagination, page: 1 });
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  // Modal operations
  const openCreateMatchModal = () => {
    setEditingMatch(null);
    setMatchFormData({
      homeTeam: '',
      awayTeam: '',
      stadiumId: '',
      matchDate: '',
      matchTime: '',
      competition: '',
      round: '',
      status: 'scheduled',
      basePrice: '',
      maxTicketsPerUser: 4,
      saleStartDate: '',
      saleEndDate: '',
      homeScore: 0,
      awayScore: 0
    });
    setError(null);
    setSuccess(null);
    setShowMatchModal(true);
  };

  const openEditMatchModal = (match) => {
    setEditingMatch(match);
    setMatchFormData({
      homeTeam: match.homeTeam || '',
      awayTeam: match.awayTeam || '',
      stadiumId: match.stadiumId || '',
      matchDate: match.matchDate || '',
      matchTime: match.matchTime ? match.matchTime.substring(0, 5) : '',
      competition: match.competition || '',
      round: match.round || '',
      status: match.status || 'scheduled',
      basePrice: match.basePrice || '',
      maxTicketsPerUser: match.maxTicketsPerUser || 4,
      saleStartDate: match.saleStartDate ? match.saleStartDate.substring(0, 16) : '',
      saleEndDate: match.saleEndDate ? match.saleEndDate.substring(0, 16) : '',
      homeScore: match.homeScore || 0,
      awayScore: match.awayScore || 0
    });
    setError(null);
    setSuccess(null);
    setShowMatchModal(true);
  };

  const closeMatchModal = () => {
    setShowMatchModal(false);
    setEditingMatch(null);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMatchFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMatchSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const formData = {
        ...matchFormData,
        basePrice: parseFloat(matchFormData.basePrice),
        maxTicketsPerUser: parseInt(matchFormData.maxTicketsPerUser),
        homeScore: parseInt(matchFormData.homeScore) || 0,
        awayScore: parseInt(matchFormData.awayScore) || 0,
        stadiumId: parseInt(matchFormData.stadiumId),
        saleStartDate: matchFormData.saleStartDate || null,
        saleEndDate: matchFormData.saleEndDate || null
      };

      if (editingMatch) {
        const response = await AdminService.updateMatch(editingMatch.id, formData);
        if (response.success) {
          setSuccess('Match updated successfully');
          fetchMatches();
          setTimeout(closeMatchModal, 2000);
        }
      } else {
        const response = await AdminService.createMatch(formData);
        if (response.success) {
          setSuccess('Match created successfully');
          fetchMatches();
          setTimeout(closeMatchModal, 2000);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save match');
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this match? This action cannot be undone.')) return;

    try {
      const response = await AdminService.deleteMatch(matchId);
      if (response.success) {
        setSuccess('Match deleted successfully');
        fetchMatches();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete match: ' + (err.message || 'Unknown error'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const openMatchDetail = (match) => {
    setSelectedMatch(match);
  };

  const closeMatchDetail = () => {
    setSelectedMatch(null);
  };

  // Helpers
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

  const getStatusLabel = (status) => {
    const labels = {
      scheduled: 'Scheduled',
      live: 'Live',
      completed: 'Completed',
      cancelled: 'Cancelled',
      postponed: 'Postponed'
    };
    return labels[status] || status;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>⚽ Match Management</h1>
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
        {error && <div style={styles.alertError}>{error}</div>}
        {success && <div style={styles.alertSuccess}>{success}</div>}

        {/* Match Detail View */}
        {selectedMatch ? (
          <div>
            <div style={styles.detailHeader}>
              <button onClick={closeMatchDetail} style={styles.backBtn}>
                ← Back to Matches
              </button>
              <h2 style={styles.detailTitle}>
                {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
              </h2>
              <button
                onClick={() => { openEditMatchModal(selectedMatch); closeMatchDetail(); }}
                style={styles.editBtn}
              >
                Edit Match
              </button>
            </div>

            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <h3 style={styles.detailCardTitle}>Match Information</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Home Team</span>
                  <span style={styles.detailValue}>{selectedMatch.homeTeam}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Away Team</span>
                  <span style={styles.detailValue}>{selectedMatch.awayTeam}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Date</span>
                  <span style={styles.detailValue}>{formatDate(selectedMatch.matchDate)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Time</span>
                  <span style={styles.detailValue}>{formatTime(selectedMatch.matchTime)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Competition</span>
                  <span style={styles.detailValue}>{selectedMatch.competition || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Round</span>
                  <span style={styles.detailValue}>{selectedMatch.round || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(selectedMatch.status)
                  }}>
                    {getStatusLabel(selectedMatch.status)}
                  </span>
                </div>
                {(selectedMatch.status === 'completed' || selectedMatch.status === 'live') && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Score</span>
                    <span style={{ ...styles.detailValue, fontWeight: '700', fontSize: '18px' }}>
                      {selectedMatch.homeScore} - {selectedMatch.awayScore}
                    </span>
                  </div>
                )}
              </div>

              <div style={styles.detailCard}>
                <h3 style={styles.detailCardTitle}>Stadium</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Name</span>
                  <span style={styles.detailValue}>{selectedMatch.stadiumName || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>City</span>
                  <span style={styles.detailValue}>{selectedMatch.stadiumCity || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Capacity</span>
                  <span style={styles.detailValue}>
                    {selectedMatch.stadiumCapacity ? selectedMatch.stadiumCapacity.toLocaleString() : '-'}
                  </span>
                </div>
              </div>

              <div style={styles.detailCard}>
                <h3 style={styles.detailCardTitle}>Ticket Sales</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Base Price</span>
                  <span style={styles.detailValue}>{formatCurrency(selectedMatch.basePrice)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Max Tickets/User</span>
                  <span style={styles.detailValue}>{selectedMatch.maxTicketsPerUser || 4}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Sale Start</span>
                  <span style={styles.detailValue}>{formatDateTime(selectedMatch.saleStartDate) || '-'}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Sale End</span>
                  <span style={styles.detailValue}>{formatDateTime(selectedMatch.saleEndDate) || '-'}</span>
                </div>
              </div>

              <div style={styles.detailCard}>
                <h3 style={styles.detailCardTitle}>Ticket Statistics</h3>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Total Tickets</span>
                  <span style={styles.detailValue}>{selectedMatch.totalTickets?.toLocaleString() || 0}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Available</span>
                  <span style={{ ...styles.detailValue, color: '#2ecc71' }}>{selectedMatch.availableTickets?.toLocaleString() || 0}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Sold</span>
                  <span style={{ ...styles.detailValue, color: '#3498db' }}>{selectedMatch.soldTickets?.toLocaleString() || 0}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Reserved</span>
                  <span style={{ ...styles.detailValue, color: '#f39c12' }}>{selectedMatch.reservedTickets?.toLocaleString() || 0}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Revenue</span>
                  <span style={{ ...styles.detailValue, fontWeight: '700', color: '#27ae60' }}>
                    {formatCurrency(selectedMatch.revenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Match List View */
          <div>
            {/* Filters */}
            <div style={screenSize === 'mobile' ? responsiveStyles.mobile.filters : screenSize === 'tablet' ? responsiveStyles.tablet.filters : styles.filters}>
              <form onSubmit={handleSearch} style={styles.searchForm}>
                <input
                  type="text"
                  placeholder="Search by team, competition, stadium or date..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={styles.searchInput}
                />
                <button type="submit" style={styles.searchBtn}>Search</button>
              </form>
              <select
                value={statusFilter}
                onChange={handleStatusFilter}
                style={styles.filterSelect}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="postponed">Postponed</option>
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPagination({ ...pagination, page: 1 }); }}
                style={styles.dateInput}
                placeholder="From date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPagination({ ...pagination, page: 1 }); }}
                style={styles.dateInput}
                placeholder="To date"
              />
              <button onClick={openCreateMatchModal} style={styles.createBtn}>
                + Add Match
              </button>
            </div>

            {/* Matches Table */}
            {loading ? (
              <div style={styles.loading}>Loading matches...</div>
            ) : (
              <>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Match</th>
                        <th style={styles.th}>Stadium</th>
                        <th style={styles.th}>Date / Time</th>
                        <th style={styles.th}>Competition</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Tickets</th>
                        <th style={styles.th}>Revenue</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(match => (
                        <tr key={match.id}>
                          <td style={styles.td}>{match.id}</td>
                          <td style={styles.td}>
                            <strong>{match.homeTeam}</strong> vs <strong>{match.awayTeam}</strong>
                          </td>
                          <td style={styles.td}>{match.stadiumName || '-'}</td>
                          <td style={styles.td}>
                            {formatDate(match.matchDate)}<br />
                            <span style={{ fontSize: '12px', color: '#95a5a6' }}>{formatTime(match.matchTime)}</span>
                          </td>
                          <td style={styles.td}>
                            {match.competition || '-'}
                            {match.round && <div style={{ fontSize: '12px', color: '#95a5a6' }}>{match.round}</div>}
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: getStatusColor(match.status)
                            }}>
                              {getStatusLabel(match.status)}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontSize: '13px' }}>
                              <span style={{ color: '#2ecc71' }}>{match.availableTickets || 0}</span>
                              <span style={{ color: '#95a5a6' }}> / </span>
                              <span style={{ color: '#3498db' }}>{match.soldTickets || 0}</span>
                              {match.reservedTickets > 0 && (
                                <span style={{ color: '#f39c12' }}> ({match.reservedTickets} res.)</span>
                              )}
                            </div>
                          </td>
                          <td style={styles.td}>{formatCurrency(match.revenue)}</td>
                          <td style={styles.td}>
                            <button
                              onClick={() => openMatchDetail(match)}
                              style={styles.smallBtn}
                              title="View details"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openEditMatchModal(match)}
                              style={styles.smallBtn}
                              title="Edit match"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMatch(match.id)}
                              style={{ ...styles.smallBtn, backgroundColor: '#e74c3c' }}
                              title="Delete match"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {matches.length === 0 && (
                        <tr>
                          <td colSpan="9" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                            No matches found. Click "Add Match" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={styles.pagination}>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    style={styles.pageBtn}
                  >
                    Previous
                  </button>
                  <span style={styles.pageInfo}>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total matches)
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    style={styles.pageBtn}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Match Modal */}
      {showMatchModal && (
        <div style={styles.modalOverlay} onClick={closeMatchModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editingMatch ? 'Edit Match' : 'Create New Match'}
            </h2>
            <form onSubmit={handleMatchSubmit}>
              {/* Home & Away Teams */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Home Team *</label>
                  <input
                    type="text"
                    name="homeTeam"
                    value={matchFormData.homeTeam}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                    placeholder="e.g. FC Barcelona"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Away Team *</label>
                  <input
                    type="text"
                    name="awayTeam"
                    value={matchFormData.awayTeam}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                    placeholder="e.g. Real Madrid"
                  />
                </div>
              </div>

              {/* Stadium & Competition */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Stadium *</label>
                  <select
                    name="stadiumId"
                    value={matchFormData.stadiumId}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  >
                    <option value="">Select Stadium</option>
                    {stadiums.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Competition</label>
                  <input
                    type="text"
                    name="competition"
                    value={matchFormData.competition}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="e.g. La Liga"
                  />
                </div>
              </div>

              {/* Date, Time, Round */}
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Match Date *</label>
                  <input
                    type="date"
                    name="matchDate"
                    value={matchFormData.matchDate}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Match Time *</label>
                  <input
                    type="time"
                    name="matchTime"
                    value={matchFormData.matchTime}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Round</label>
                  <input
                    type="text"
                    name="round"
                    value={matchFormData.round}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="e.g. Round 1"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select
                    name="status"
                    value={matchFormData.status}
                    onChange={handleInputChange}
                    style={styles.input}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>
              </div>

              {/* Score (when editing) */}
              {editingMatch && (
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Home Score</label>
                    <input
                      type="number"
                      name="homeScore"
                      value={matchFormData.homeScore}
                      onChange={handleInputChange}
                      min="0"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Away Score</label>
                    <input
                      type="number"
                      name="awayScore"
                      value={matchFormData.awayScore}
                      onChange={handleInputChange}
                      min="0"
                      style={styles.input}
                    />
                  </div>
                </div>
              )}

              {/* Ticket Settings */}
              <h3 style={styles.sectionLabel}>Ticket Settings</h3>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Base Ticket Price (€) *</label>
                  <input
                    type="number"
                    name="basePrice"
                    value={matchFormData.basePrice}
                    onChange={handleInputChange}
                    required
                    min="0.01"
                    step="0.01"
                    style={styles.input}
                    placeholder="e.g. 50.00"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Max Tickets Per User</label>
                  <input
                    type="number"
                    name="maxTicketsPerUser"
                    value={matchFormData.maxTicketsPerUser}
                    onChange={handleInputChange}
                    min="1"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ticket Sale Start</label>
                  <input
                    type="datetime-local"
                    name="saleStartDate"
                    value={matchFormData.saleStartDate}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ticket Sale End</label>
                  <input
                    type="datetime-local"
                    name="saleEndDate"
                    value={matchFormData.saleEndDate}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={closeMatchModal} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingMatch ? 'Update Match' : 'Create Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
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
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    minWidth: '250px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  searchBtn: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  filterSelect: {
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
  },
  dateInput: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '140px',
  },
  createBtn: {
    padding: '10px 20px',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  tableContainer: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  th: {
    padding: '14px 12px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    fontWeight: '600',
    fontSize: '13px',
    color: '#555',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px 12px',
    fontSize: '14px',
    borderBottom: '1px solid #eee',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
    fontWeight: '600',
  },
  smallBtn: {
    padding: '5px 10px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '4px',
    marginBottom: '4px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  pageBtn: {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#555',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#555',
  },
  alertError: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  alertSuccess: {
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    color: '#059669',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  // Detail view styles
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  backBtn: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  editBtn: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  detailTitle: {
    margin: '0',
    fontSize: '20px',
    color: '#2c3e50',
    flex: 1,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  detailCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  detailCardTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    color: '#2c3e50',
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#7f8c8d',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: '14px',
    color: '#2c3e50',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    color: '#2c3e50',
  },
  sectionLabel: {
    margin: '20px 0 12px 0',
    fontSize: '16px',
    color: '#2c3e50',
    borderBottom: '1px solid #eee',
    paddingBottom: '8px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
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
    filters: {
      ...styles.filters,
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    searchForm: {
      ...styles.searchForm,
      minWidth: 'auto',
    },
  },
  tablet: {
    main: {
      ...styles.main,
      padding: '30px 15px',
    },
    filters: {
      ...styles.filters,
    },
  }
};

export default AdminMatches;