import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Form, Button, Alert, Table, Badge, Modal, Spinner, Card, ProgressBar,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';

// ─── Tier helpers ────────────────────────────────────────────────────────────
const getTierInfo = (name = '', multiplier = 1) => {
  const n = name.toLowerCase();
  if (n.includes('vip') || n.includes('suite') || n.includes('palco') || multiplier >= 3.5)
    return { label: 'VIP', color: '#f39c12', bg: '#fff8e1', badgeBg: 'warning', icon: '👑' };
  if (n.includes('club') || n.includes('premium') || n.includes('platinum') || multiplier >= 2.5)
    return { label: 'Premium', color: '#3498db', bg: '#e8f4fd', badgeBg: 'primary', icon: '⭐' };
  if (multiplier >= 1.5)
    return { label: 'Standard', color: '#27ae60', bg: '#eafaf1', badgeBg: 'success', icon: '🎟️' };
  return { label: 'General', color: '#7f8c8d', bg: '#f2f3f4', badgeBg: 'secondary', icon: '🎫' };
};

// ─── Mini Seat Preview ────────────────────────────────────────────────────────
const MiniSeatPreview = ({ rows, seatsPerRow }) => {
  const maxRows = Math.min(rows, 5);
  const maxCols = Math.min(seatsPerRow, 10);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', padding: '6px 0' }}>
      {Array.from({ length: maxRows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: maxCols }).map((_, c) => (
            <div
              key={c}
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: r === 0 ? '#f39c12' : '#3498db',
                opacity: 0.85,
              }}
            />
          ))}
          {seatsPerRow > maxCols && (
            <span style={{ fontSize: 8, color: '#999', lineHeight: '8px' }}>+{seatsPerRow - maxCols}</span>
          )}
        </div>
      ))}
      {rows > maxRows && (
        <span style={{ fontSize: 9, color: '#aaa' }}>+{rows - maxRows} more rows</span>
      )}
    </div>
  );
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ section, stadiumCapacity, onEdit, onDelete }) => {
  // Backend Section model uses camelCase: rowCount, seatsPerRow, priceMultiplier
  const rows = Number(section.rowCount ?? section.row_count ?? 0);
  const seatsPerRow = Number(section.seatsPerRow ?? section.seats_per_row ?? 0);
  const multiplier = Number(section.priceMultiplier ?? section.price_multiplier ?? 1);
  const totalSeats = rows * seatsPerRow;
  const tier = getTierInfo(section.name, multiplier);
  const pct = stadiumCapacity > 0 ? Math.min(100, Math.round((totalSeats / stadiumCapacity) * 100)) : 0;

  return (
    <Card
      className="h-100 shadow-sm"
      style={{
        border: `2px solid ${tier.color}22`,
        borderTop: `4px solid ${tier.color}`,
        background: tier.bg,
        transition: 'box-shadow 0.2s',
      }}
    >
      <Card.Body className="d-flex flex-column">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <span style={{ fontSize: 18, marginRight: 6 }}>{tier.icon}</span>
            <span className="fw-bold">{section.name}</span>
          </div>
          <Badge bg={tier.badgeBg} style={{ fontSize: 10 }}>{tier.label}</Badge>
        </div>

        {/* Stats row */}
        <div className="d-flex gap-3 mb-3 flex-wrap">
          <div className="text-center">
            <div className="small text-muted">Rows</div>
            <div className="fw-bold fs-6">{rows}</div>
          </div>
          <div className="text-center">
            <div className="small text-muted">Seats/Row</div>
            <div className="fw-bold fs-6">{seatsPerRow}</div>
          </div>
          <div className="text-center">
            <div className="small text-muted">Total Seats</div>
            <div className="fw-bold fs-6" style={{ color: tier.color }}>{totalSeats.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="small text-muted">Price ×</div>
            <div className="fw-bold fs-6" style={{ color: tier.color }}>×{multiplier}</div>
          </div>
        </div>

        {/* Mini seat preview */}
        <div className="rounded mb-2 text-center" style={{ background: '#fff', border: '1px solid #eee', padding: '4px 0' }}>
          <MiniSeatPreview rows={rows} seatsPerRow={seatsPerRow} />
        </div>

        {/* Capacity bar */}
        {stadiumCapacity > 0 && (
          <div className="mb-2">
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span>Stadium share</span>
              <span>{pct}%</span>
            </div>
            <ProgressBar
              now={pct}
              style={{ height: 5, borderRadius: 3 }}
              variant={tier.badgeBg === 'warning' ? 'warning' : tier.badgeBg === 'primary' ? 'primary' : 'success'}
            />
          </div>
        )}

        {/* Description */}
        {section.description && (
          <p className="small text-muted mb-2 fst-italic" style={{ lineClamp: 2 }}>
            {section.description}
          </p>
        )}

        {/* Actions */}
        <div className="d-flex gap-2 mt-auto pt-2">
          <Button size="sm" variant="outline-primary" className="flex-fill" onClick={() => onEdit(section)}>
            ✏️ Edit
          </Button>
          <Button size="sm" variant="outline-danger" onClick={() => onDelete(section.id)}>
            🗑️
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminStadiums = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Stadium list state
  const [stadiums, setStadiums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);

  // Stadium modal state
  const [showStadiumModal, setShowStadiumModal] = useState(false);
  const [editingStadium, setEditingStadium] = useState(null);
  const [stadiumFormData, setStadiumFormData] = useState({
    name: '', city: '', country: '', capacity: '',
    address: '', imageUrl: '', description: '', isActive: 1,
  });

  // Sections panel state
  const [selectedStadium, setSelectedStadium] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  // Section modal state
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionFormData, setSectionFormData] = useState({
    name: '', rowCount: '', seatsPerRow: '', priceMultiplier: '1.0', description: '',
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isAdmin()) { navigate('/home'); return; }
    fetchStadiums();
    fetchCities();
  }, [pagination.page, search, selectedCity]);

  // ── Data fetchers ────────────────────────────────────────────────────────
  const fetchStadiums = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getStadiums({
        page: pagination.page, limit: pagination.limit, search, city: selectedCity,
      });
      if (response.success && response.data) {
        setStadiums(response.data.stadiums || []);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
        });
      }
    } catch (err) {
      setError('Failed to load stadiums: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await AdminService.getStadiumCities();
      if (response.success) setCities(response.data || []);
    } catch (err) {
      console.warn('Failed to fetch cities:', err);
    }
  };

  const fetchSections = async (stadiumId) => {
    try {
      setSectionsLoading(true);
      setSections([]);
      setError(null);
      const response = await AdminService.getSections(stadiumId);
      // API returns { success, data } — data may be array or object with sections
      if (response.success) {
        const raw = response.data;
        if (Array.isArray(raw)) {
          setSections(raw);
        } else if (raw && Array.isArray(raw.sections)) {
          setSections(raw.sections);
        } else if (raw && raw.id) {
          // getStadiumWithSections returns stadium object with sections array
          setSections(raw.sections || []);
        } else {
          setSections([]);
        }
      }
    } catch (err) {
      // If the endpoint fails (e.g. 404 no sections yet), just show empty
      console.warn('fetchSections error:', err);
      setSections([]);
    } finally {
      setSectionsLoading(false);
    }
  };

  // ── Stadium CRUD ──────────────────────────────────────────────────────────
  const openCreateStadiumModal = () => {
    setEditingStadium(null);
    setStadiumFormData({ name: '', city: '', country: '', capacity: '', address: '', imageUrl: '', description: '', isActive: 1 });
    setError(null); setSuccess(null);
    setShowStadiumModal(true);
  };

  const openEditStadiumModal = (stadium) => {
    setEditingStadium(stadium);
    setStadiumFormData({
      name: stadium.name, city: stadium.city, country: stadium.country,
      capacity: stadium.capacity, address: stadium.address || '',
      // Stadium model also camelCases: imageUrl, isActive
      imageUrl: stadium.imageUrl ?? stadium.image_url ?? '',
      description: stadium.description || '',
      isActive: stadium.isActive ?? stadium.is_active ?? 1,
    });
    setError(null); setSuccess(null);
    setShowStadiumModal(true);
  };

  const closeStadiumModal = () => {
    setShowStadiumModal(false);
    setEditingStadium(null);
    setError(null); setSuccess(null);
  };

  const handleStadiumInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStadiumFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 1 : 0) : value }));
  };

  const handleStadiumSubmit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      const formData = { ...stadiumFormData, capacity: parseInt(stadiumFormData.capacity) };
      if (editingStadium) {
        const r = await AdminService.updateStadium(editingStadium.id, formData);
        if (r.success) { setSuccess('Stadium updated successfully'); fetchStadiums(); setTimeout(closeStadiumModal, 1500); }
      } else {
        const r = await AdminService.createStadium(formData);
        if (r.success) { setSuccess('Stadium created successfully'); fetchStadiums(); setTimeout(closeStadiumModal, 1500); }
      }
    } catch (err) {
      setError(err.message || 'Failed to save stadium');
    }
  };

  const handleDeleteStadium = async (stadiumId) => {
    if (!window.confirm('Deactivate this stadium?')) return;
    try {
      const r = await AdminService.deleteStadium(stadiumId);
      if (r.success) { setSuccess('Stadium deactivated'); fetchStadiums(); setTimeout(() => setSuccess(null), 3000); }
    } catch (err) {
      setError('Failed: ' + (err.message || 'Unknown error'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages)
      setPagination(p => ({ ...p, page: newPage }));
  };

  // ── Sections panel ────────────────────────────────────────────────────────
  const openStadiumSections = async (stadium) => {
    setSelectedStadium(stadium);
    await fetchSections(stadium.id);
  };

  const closeStadiumSections = () => {
    setSelectedStadium(null);
    setSections([]);
    setError(null);
    setSuccess(null);
  };

  // ── Section CRUD ──────────────────────────────────────────────────────────
  const openCreateSectionModal = () => {
    setEditingSection(null);
    setSectionFormData({ name: '', rowCount: '', seatsPerRow: '', priceMultiplier: '1.0', description: '' });
    setError(null); setSuccess(null);
    setShowSectionModal(true);
  };

  const openEditSectionModal = (section) => {
    setEditingSection(section);
    setSectionFormData({
      name: section.name,
      rowCount: section.rowCount ?? section.row_count ?? '',
      seatsPerRow: section.seatsPerRow ?? section.seats_per_row ?? '',
      priceMultiplier: section.priceMultiplier ?? section.price_multiplier ?? '1.0',
      description: section.description || '',
    });
    setError(null); setSuccess(null);
    setShowSectionModal(true);
  };

  const closeSectionModal = () => {
    setShowSectionModal(false);
    setEditingSection(null);
    setError(null); setSuccess(null);
  };

  const handleSectionInputChange = (e) => {
    const { name, value } = e.target;
    setSectionFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      const formData = {
        ...sectionFormData,
        rowCount: parseInt(sectionFormData.rowCount),
        seatsPerRow: parseInt(sectionFormData.seatsPerRow),
        priceMultiplier: parseFloat(sectionFormData.priceMultiplier),
      };
      if (editingSection) {
        const r = await AdminService.updateSection(selectedStadium.id, editingSection.id, formData);
        if (r.success) { setSuccess('Section updated'); await fetchSections(selectedStadium.id); setTimeout(closeSectionModal, 1500); }
      } else {
        const r = await AdminService.createSection(selectedStadium.id, formData);
        if (r.success) { setSuccess('Section created'); await fetchSections(selectedStadium.id); setTimeout(closeSectionModal, 1500); }
      }
    } catch (err) {
      setError(err.message || 'Failed to save section');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      const r = await AdminService.deleteSection(selectedStadium.id, sectionId);
      if (r.success) { setSuccess('Section deleted'); await fetchSections(selectedStadium.id); setTimeout(() => setSuccess(null), 3000); }
    } catch (err) {
      setError('Failed: ' + (err.message || 'Unknown error'));
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!isAdmin()) return null;

  // ── Derived stats for sections panel header ───────────────────────────────
  const totalSectionSeats = sections.reduce((s, sec) => {
    const r = Number(sec.rowCount ?? sec.row_count ?? 0);
    const sp = Number(sec.seatsPerRow ?? sec.seats_per_row ?? 0);
    return s + r * sp;
  }, 0);
  const stadiumCapacity = selectedStadium?.capacity || 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="🏟️ Stadium Management" subtitle="Manage venues and seating sections" />

      <Container className="py-4">
        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

        {/* ══ SECTIONS PANEL ══════════════════════════════════════════════════ */}
        {selectedStadium ? (
          <div>
            {/* Header */}
            <div
              className="rounded-3 mb-4 p-4"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
                color: '#fff',
              }}
            >
              <div className="d-flex flex-wrap align-items-center gap-3">
                <Button variant="light" size="sm" onClick={closeStadiumSections}>
                  ← Back to Stadiums
                </Button>
                <div className="flex-grow-1">
                  <h2 className="h4 mb-0 fw-bold">🏟️ {selectedStadium.name}</h2>
                  <p className="mb-0 small" style={{ opacity: 0.7 }}>
                    {selectedStadium.city}, {selectedStadium.country} · Capacity: {stadiumCapacity.toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="warning"
                  className="fw-semibold"
                  onClick={openCreateSectionModal}
                  style={{ color: '#000' }}
                >
                  + Add Section
                </Button>
              </div>

              {/* Summary row */}
              {sections.length > 0 && (
                <div className="d-flex flex-wrap gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>SECTIONS</div>
                    <div className="fw-bold fs-5">{sections.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>TOTAL SEATS (SECTIONS)</div>
                    <div className="fw-bold fs-5">{totalSectionSeats.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>VIP SECTIONS</div>
                    <div className="fw-bold fs-5">
                    {sections.filter(s => getTierInfo(s.name, Number(s.priceMultiplier ?? 1)).label === 'VIP').length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>AVG PRICE ×</div>
                  <div className="fw-bold fs-5">
                    ×{sections.length > 0
                      ? (sections.reduce((s, sec) => s + Number(sec.priceMultiplier ?? 1), 0) / sections.length).toFixed(1)
                      : '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sections grid */}
            {sectionsLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="text-muted mt-2">Loading sections…</p>
              </div>
            ) : sections.length === 0 ? (
              <div
                className="text-center py-5 rounded-3"
                style={{ background: '#fff', border: '2px dashed #dee2e6' }}
              >
                <div style={{ fontSize: 48 }}>🏟️</div>
                <h4 className="mt-3 text-muted">No sections yet</h4>
                <p className="text-muted small mb-4">
                  Add seating sections to define the layout of <strong>{selectedStadium.name}</strong>.
                </p>
                <Button variant="primary" onClick={openCreateSectionModal}>
                  + Add First Section
                </Button>
              </div>
            ) : (
              <Row className="g-3">
                {sections.map(section => (
                  <Col key={section.id} xs={12} sm={6} md={4} xl={3}>
                    <SectionCard
                      section={section}
                      stadiumCapacity={stadiumCapacity}
                      onEdit={openEditSectionModal}
                      onDelete={handleDeleteSection}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </div>

        ) : (
          /* ══ STADIUMS LIST ════════════════════════════════════════════════ */
          <div>
            <Row className="g-3 mb-4 align-items-center">
              <Col xs={12} lg>
                <Form onSubmit={(e) => { e.preventDefault(); setPagination(p => ({ ...p, page: 1 })); fetchStadiums(); }} className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder="Search by name, city, or address…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button type="submit" variant="primary">Search</Button>
                </Form>
              </Col>
              <Col xs={12} sm={6} md={4} lg="auto">
                <Form.Select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
                  <option value="">All Cities</option>
                  {cities.map(city => <option key={city} value={city}>{city}</option>)}
                </Form.Select>
              </Col>
              <Col xs={12} sm={6} md="auto">
                <Button variant="success" onClick={openCreateStadiumModal} className="w-100">
                  + Add Stadium
                </Button>
              </Col>
            </Row>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="text-muted mt-2">Loading stadiums…</p>
              </div>
            ) : (
              <>
                <div className="table-responsive bg-white rounded shadow-sm">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>City</th>
                        <th>Country</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stadiums.map(stadium => (
                        <tr key={stadium.id}>
                          <td className="text-muted small">{stadium.id}</td>
                          <td className="fw-semibold">{stadium.name}</td>
                          <td>{stadium.city}</td>
                          <td>{stadium.country}</td>
                          <td>{stadium.capacity.toLocaleString()}</td>
                          <td>
                            <Badge bg={(stadium.isActive ?? stadium.is_active) ? 'success' : 'secondary'}>
                              {(stadium.isActive ?? stadium.is_active) ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="dark"
                              className="me-1 mb-1"
                              onClick={() => openStadiumSections(stadium)}
                              title="Manage seating sections"
                            >
                              🪑 Sections
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="me-1 mb-1"
                              onClick={() => openEditStadiumModal(stadium)}
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="mb-1"
                              onClick={() => handleDeleteStadium(stadium.id)}
                            >
                              🗑️
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {stadiums.length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-5">
                            No stadiums found. Click &quot;Add Stadium&quot; to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                    <Button variant="outline-secondary" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
                      ← Prev
                    </Button>
                    <span className="text-muted small">
                      Page {pagination.page} of {pagination.totalPages} &nbsp;·&nbsp; {pagination.total} stadiums
                    </span>
                    <Button variant="outline-secondary" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>
                      Next →
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Container>

      {/* ══ STADIUM MODAL ═══════════════════════════════════════════════════ */}
      <Modal show={showStadiumModal} onHide={closeStadiumModal} centered size="lg">
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>{editingStadium ? '✏️ Edit Stadium' : '🏟️ Create New Stadium'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleStadiumSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control name="name" value={stadiumFormData.name} onChange={handleStadiumInputChange} required />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>City *</Form.Label>
                  <Form.Control name="city" value={stadiumFormData.city} onChange={handleStadiumInputChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Country *</Form.Label>
                  <Form.Control name="country" value={stadiumFormData.country} onChange={handleStadiumInputChange} required />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Capacity *</Form.Label>
                  <Form.Control type="number" name="capacity" value={stadiumFormData.capacity} onChange={handleStadiumInputChange} required min="1" />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control name="address" value={stadiumFormData.address} onChange={handleStadiumInputChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Image URL</Form.Label>
              <Form.Control type="url" name="imageUrl" value={stadiumFormData.imageUrl} onChange={handleStadiumInputChange} placeholder="https://…" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={stadiumFormData.description} onChange={handleStadiumInputChange} />
            </Form.Group>
            <Form.Check type="switch" name="isActive" id="stadiumActive" label="Active Stadium" checked={stadiumFormData.isActive === 1} onChange={handleStadiumInputChange} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeStadiumModal}>Cancel</Button>
            <Button type="submit" variant="primary">{editingStadium ? 'Update Stadium' : 'Create Stadium'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ══ SECTION MODAL ═══════════════════════════════════════════════════ */}
      <Modal show={showSectionModal} onHide={closeSectionModal} centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>{editingSection ? '✏️ Edit Section' : '🪑 Add New Section'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSectionSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row>
              <Col sm={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Section Name *</Form.Label>
                  <Form.Control name="name" value={sectionFormData.name} onChange={handleSectionInputChange} required placeholder="e.g. VIP North, East Stand…" />
                </Form.Group>
              </Col>
              <Col sm={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Price Multiplier</Form.Label>
                  <Form.Control type="number" name="priceMultiplier" value={sectionFormData.priceMultiplier} onChange={handleSectionInputChange} step="0.1" min="0.1" max="10" />
                  <Form.Text className="text-muted">Base price × this</Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Number of Rows *</Form.Label>
                  <Form.Control type="number" name="rowCount" value={sectionFormData.rowCount} onChange={handleSectionInputChange} required min="1" />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Seats per Row *</Form.Label>
                  <Form.Control type="number" name="seatsPerRow" value={sectionFormData.seatsPerRow} onChange={handleSectionInputChange} required min="1" />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} name="description" value={sectionFormData.description} onChange={handleSectionInputChange} placeholder="Optional notes about this section…" />
            </Form.Group>

            {/* Live preview */}
            <div className="rounded p-3" style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold small">Live Preview</span>
                {sectionFormData.name && (
                  <Badge bg={getTierInfo(sectionFormData.name, parseFloat(sectionFormData.priceMultiplier) || 1).badgeBg}>
                    {getTierInfo(sectionFormData.name, parseFloat(sectionFormData.priceMultiplier) || 1).label}
                  </Badge>
                )}
              </div>
              <div className="d-flex gap-3 align-items-center">
                {(sectionFormData.rowCount && sectionFormData.seatsPerRow) ? (
                  <MiniSeatPreview rows={parseInt(sectionFormData.rowCount) || 0} seatsPerRow={parseInt(sectionFormData.seatsPerRow) || 0} />
                ) : (
                  <span className="text-muted small">Enter rows & seats to preview</span>
                )}
                <div>
                  <div className="fw-bold fs-5">
                    {((parseInt(sectionFormData.rowCount) || 0) * (parseInt(sectionFormData.seatsPerRow) || 0)).toLocaleString()}
                  </div>
                  <div className="small text-muted">total seats</div>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeSectionModal}>Cancel</Button>
            <Button type="submit" variant="primary">{editingSection ? 'Update Section' : 'Create Section'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminStadiums;
