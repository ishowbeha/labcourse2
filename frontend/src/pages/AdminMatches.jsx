import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Form, Button, Alert, Table, Badge, Modal, Spinner,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';
import AdvancedSearchBar from '../components/search/AdvancedSearchBar';

const AdminMatches = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [advFilters, setAdvFilters] = useState({});
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [stadiums, setStadiums] = useState([]);

  const matchSortOptions = [
    { value: 'matchDate', label: 'Match Date' },
    { value: 'basePrice', label: 'Base Price' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'homeTeam', label: 'Home Team' },
  ];

  const matchFilterDefs = useMemo(() => [
    { id: 'status', label: 'Status', type: 'select', options: [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'live', label: 'Live' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'postponed', label: 'Postponed' },
    ]},
    { id: 'dateFrom', label: 'Date From', type: 'date' },
    { id: 'dateTo', label: 'Date To', type: 'date' },
    { id: 'priceMin', label: 'Min Price (€)', type: 'number', placeholder: '0', min: 0 },
    { id: 'priceMax', label: 'Max Price (€)', type: 'number', placeholder: '1000', min: 0 },
    { id: 'stadiumId', label: 'Stadium', type: 'select', options:
      stadiums.map(s => ({ value: String(s.id), label: `${s.name} (${s.city})` }))
    },
  ], [stadiums]);

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

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/home');
      return;
    }
    fetchMatches();
  }, [pagination.page, statusFilter, search, dateFrom, dateTo, advFilters, sortField, sortDir]);

  useEffect(() => {
    if (isAdmin()) {
      fetchStadiums();
    }
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search,
        status: advFilters.status || statusFilter,
        dateFrom: advFilters.dateFrom || dateFrom,
        dateTo: advFilters.dateTo || dateTo,
        ...(advFilters.priceMin ? { priceMin: advFilters.priceMin } : {}),
        ...(advFilters.priceMax ? { priceMax: advFilters.priceMax } : {}),
        ...(advFilters.stadiumId ? { stadiumId: advFilters.stadiumId } : {}),
        ...(sortField ? { sortBy: sortField, sortDir } : {}),
      };
      const response = await AdminService.getAdminMatches(params);
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
    if (e) e.preventDefault();
    setSearch(searchInput);
    setPagination({ ...pagination, page: 1 });
  };

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const handleAdvFilterChange = (id, value) => {
    setAdvFilters((prev) => ({ ...prev, [id]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleAdvReset = () => {
    setSearchInput('');
    setSearch('');
    setAdvFilters({});
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSortField('');
    setSortDir('asc');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

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

  const DetailRow = ({ label, children }) => (
    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
      <span className="text-muted small fw-medium">{label}</span>
      <span className="small fw-medium">{children}</span>
    </div>
  );

  return (
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="⚽ Match Management" subtitle="Schedule and manage football matches" />

      <Container className="py-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {selectedMatch ? (
          <div>
            <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
              <Button variant="secondary" onClick={closeMatchDetail}>
                ← Back to Matches
              </Button>
              <h2 className="h4 mb-0 flex-grow-1">
                {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
              </h2>
              <Button
                variant="primary"
                onClick={() => { openEditMatchModal(selectedMatch); closeMatchDetail(); }}
              >
                Edit Match
              </Button>
            </div>

            <Row className="g-4">
              <Col md={6}>
                <Card className="shadow-sm h-100">
                  <Card.Header className="fw-semibold">Match Information</Card.Header>
                  <Card.Body>
                    <DetailRow label="Home Team">{selectedMatch.homeTeam}</DetailRow>
                    <DetailRow label="Away Team">{selectedMatch.awayTeam}</DetailRow>
                    <DetailRow label="Date">{formatDate(selectedMatch.matchDate)}</DetailRow>
                    <DetailRow label="Time">{formatTime(selectedMatch.matchTime)}</DetailRow>
                    <DetailRow label="Competition">{selectedMatch.competition || '-'}</DetailRow>
                    <DetailRow label="Round">{selectedMatch.round || '-'}</DetailRow>
                    <DetailRow label="Status">
                      <Badge style={{ backgroundColor: getStatusColor(selectedMatch.status) }}>
                        {getStatusLabel(selectedMatch.status)}
                      </Badge>
                    </DetailRow>
                    {(selectedMatch.status === 'completed' || selectedMatch.status === 'live') && (
                      <DetailRow label="Score">
                        <span className="fw-bold fs-5">{selectedMatch.homeScore} - {selectedMatch.awayScore}</span>
                      </DetailRow>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="shadow-sm h-100">
                  <Card.Header className="fw-semibold">Stadium</Card.Header>
                  <Card.Body>
                    <DetailRow label="Name">{selectedMatch.stadiumName || '-'}</DetailRow>
                    <DetailRow label="City">{selectedMatch.stadiumCity || '-'}</DetailRow>
                    <DetailRow label="Capacity">
                      {selectedMatch.stadiumCapacity ? selectedMatch.stadiumCapacity.toLocaleString() : '-'}
                    </DetailRow>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="shadow-sm h-100">
                  <Card.Header className="fw-semibold">Ticket Sales</Card.Header>
                  <Card.Body>
                    <DetailRow label="Base Price">{formatCurrency(selectedMatch.basePrice)}</DetailRow>
                    <DetailRow label="Max Tickets/User">{selectedMatch.maxTicketsPerUser || 4}</DetailRow>
                    <DetailRow label="Sale Start">{formatDateTime(selectedMatch.saleStartDate) || '-'}</DetailRow>
                    <DetailRow label="Sale End">{formatDateTime(selectedMatch.saleEndDate) || '-'}</DetailRow>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="shadow-sm h-100">
                  <Card.Header className="fw-semibold">Ticket Statistics</Card.Header>
                  <Card.Body>
                    <DetailRow label="Total Tickets">{selectedMatch.totalTickets?.toLocaleString() || 0}</DetailRow>
                    <DetailRow label="Available">
                      <span className="text-success">{selectedMatch.availableTickets?.toLocaleString() || 0}</span>
                    </DetailRow>
                    <DetailRow label="Sold">
                      <span className="text-primary">{selectedMatch.soldTickets?.toLocaleString() || 0}</span>
                    </DetailRow>
                    <DetailRow label="Reserved">
                      <span className="text-warning">{selectedMatch.reservedTickets?.toLocaleString() || 0}</span>
                    </DetailRow>
                    <DetailRow label="Revenue">
                      <span className="fw-bold text-success">{formatCurrency(selectedMatch.revenue)}</span>
                    </DetailRow>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <div>
            {/* Advanced Search Bar */}
            <div className="mb-4">
              <AdvancedSearchBar
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                onSearch={handleSearch}
                onReset={handleAdvReset}
                placeholder="Search by team, competition, stadium…"
                filters={matchFilterDefs}
                filterValues={advFilters}
                onFilterChange={handleAdvFilterChange}
                sortOptions={matchSortOptions}
                sortValue={sortField}
                sortDir={sortDir}
                onSortChange={(f, d) => { setSortField(f); setSortDir(d); setPagination(p => ({...p, page:1})); }}
                resultCount={pagination.total}
              />
            </div>
            <div className="d-flex justify-content-end mb-3">
              <Button variant="success" onClick={openCreateMatchModal}>
                + Add Match
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" role="status" />
                <p className="text-muted mt-2 mb-0">Loading matches...</p>
              </div>
            ) : (
              <>
                <div className="table-responsive bg-white rounded shadow-sm">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Match</th>
                        <th>Stadium</th>
                        <th>Date / Time</th>
                        <th>Competition</th>
                        <th>Status</th>
                        <th>Tickets</th>
                        <th>Revenue</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(match => (
                        <tr key={match.id}>
                          <td>{match.id}</td>
                          <td>
                            <strong>{match.homeTeam}</strong> vs <strong>{match.awayTeam}</strong>
                          </td>
                          <td>{match.stadiumName || '-'}</td>
                          <td>
                            {formatDate(match.matchDate)}<br />
                            <small className="text-muted">{formatTime(match.matchTime)}</small>
                          </td>
                          <td>
                            {match.competition || '-'}
                            {match.round && <div className="small text-muted">{match.round}</div>}
                          </td>
                          <td>
                            <Badge style={{ backgroundColor: getStatusColor(match.status) }}>
                              {getStatusLabel(match.status)}
                            </Badge>
                          </td>
                          <td>
                            <small>
                              <span className="text-success">{match.availableTickets || 0}</span>
                              <span className="text-muted"> / </span>
                              <span className="text-primary">{match.soldTickets || 0}</span>
                              {match.reservedTickets > 0 && (
                                <span className="text-warning"> ({match.reservedTickets} res.)</span>
                              )}
                            </small>
                          </td>
                          <td>{formatCurrency(match.revenue)}</td>
                          <td>
                            <Button size="sm" variant="primary" className="me-1 mb-1" onClick={() => openMatchDetail(match)} title="View details">
                              View
                            </Button>
                            <Button size="sm" variant="primary" className="me-1 mb-1" onClick={() => openEditMatchModal(match)} title="Edit match">
                              Edit
                            </Button>
                            <Button size="sm" variant="danger" className="mb-1" onClick={() => handleDeleteMatch(match.id)} title="Delete match">
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {matches.length === 0 && (
                        <tr>
                          <td colSpan="9" className="text-center text-muted py-5">
                            No matches found. Click &quot;Add Match&quot; to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>

                <div className="d-flex justify-content-center align-items-center gap-3 mt-4 flex-wrap">
                  <Button
                    variant="primary"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-muted">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total matches)
                  </span>
                  <Button
                    variant="primary"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Container>

      <Modal show={showMatchModal} onHide={closeMatchModal} centered size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>{editingMatch ? 'Edit Match' : 'Create New Match'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleMatchSubmit}>
          <Modal.Body>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Home Team *</Form.Label>
                  <Form.Control type="text" name="homeTeam" value={matchFormData.homeTeam} onChange={handleInputChange} required placeholder="e.g. FC Barcelona" />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Away Team *</Form.Label>
                  <Form.Control type="text" name="awayTeam" value={matchFormData.awayTeam} onChange={handleInputChange} required placeholder="e.g. Real Madrid" />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Stadium *</Form.Label>
                  <Form.Select name="stadiumId" value={matchFormData.stadiumId} onChange={handleInputChange} required>
                    <option value="">Select Stadium</option>
                    {stadiums.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Competition</Form.Label>
                  <Form.Control type="text" name="competition" value={matchFormData.competition} onChange={handleInputChange} placeholder="e.g. La Liga" />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Match Date *</Form.Label>
                  <Form.Control type="date" name="matchDate" value={matchFormData.matchDate} onChange={handleInputChange} required />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Match Time *</Form.Label>
                  <Form.Control type="time" name="matchTime" value={matchFormData.matchTime} onChange={handleInputChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Round</Form.Label>
                  <Form.Control type="text" name="round" value={matchFormData.round} onChange={handleInputChange} placeholder="e.g. Round 1" />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={matchFormData.status} onChange={handleInputChange}>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="postponed">Postponed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            {editingMatch && (
              <Row>
                <Col sm={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Home Score</Form.Label>
                    <Form.Control type="number" name="homeScore" value={matchFormData.homeScore} onChange={handleInputChange} min="0" />
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Away Score</Form.Label>
                    <Form.Control type="number" name="awayScore" value={matchFormData.awayScore} onChange={handleInputChange} min="0" />
                  </Form.Group>
                </Col>
              </Row>
            )}

            <h5 className="border-bottom pb-2 mt-2 mb-3">Ticket Settings</h5>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Base Ticket Price (€) *</Form.Label>
                  <Form.Control type="number" name="basePrice" value={matchFormData.basePrice} onChange={handleInputChange} required min="0.01" step="0.01" placeholder="e.g. 50.00" />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Tickets Per User</Form.Label>
                  <Form.Control type="number" name="maxTicketsPerUser" value={matchFormData.maxTicketsPerUser} onChange={handleInputChange} min="1" />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ticket Sale Start</Form.Label>
                  <Form.Control type="datetime-local" name="saleStartDate" value={matchFormData.saleStartDate} onChange={handleInputChange} />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ticket Sale End</Form.Label>
                  <Form.Control type="datetime-local" name="saleEndDate" value={matchFormData.saleEndDate} onChange={handleInputChange} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeMatchModal}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingMatch ? 'Update Match' : 'Create Match'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminMatches;
