import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Form, Button, Alert, Table, Badge, Modal, Spinner,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';

const AdminStadiums = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [stadiums, setStadiums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);
  const [showStadiumModal, setShowStadiumModal] = useState(false);
  const [editingStadium, setEditingStadium] = useState(null);
  const [stadiumFormData, setStadiumFormData] = useState({
    name: '',
    city: '',
    country: '',
    capacity: '',
    address: '',
    imageUrl: '',
    description: '',
    isActive: 1
  });

  const [selectedStadium, setSelectedStadium] = useState(null);
  const [sections, setSections] = useState([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionFormData, setSectionFormData] = useState({
    name: '',
    rowCount: '',
    seatsPerRow: '',
    priceMultiplier: '1.0',
    description: ''
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/home');
      return;
    }
    fetchStadiums();
    fetchCities();
  }, [pagination.page, search, selectedCity]);

  const fetchStadiums = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getStadiums({
        page: pagination.page,
        limit: pagination.limit,
        search,
        city: selectedCity
      });
      if (response.success && response.data) {
        setStadiums(response.data.stadiums || []);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        });
      }
    } catch (err) {
      console.error('Failed to fetch stadiums:', err);
      setError('Failed to load stadiums: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await AdminService.getStadiumCities();
      if (response.success) {
        setCities(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    }
  };

  const fetchSections = async (stadiumId) => {
    try {
      const response = await AdminService.getSections(stadiumId);
      if (response.success) {
        setSections(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch sections:', err);
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
    setPagination({ ...pagination, page: 1 });
    fetchStadiums();
  };

  const handleCityFilter = (e) => {
    setSelectedCity(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const openCreateStadiumModal = () => {
    setEditingStadium(null);
    setStadiumFormData({
      name: '',
      city: '',
      country: '',
      capacity: '',
      address: '',
      imageUrl: '',
      description: '',
      isActive: 1
    });
    setShowStadiumModal(true);
  };

  const openEditStadiumModal = (stadium) => {
    setEditingStadium(stadium);
    setStadiumFormData({
      name: stadium.name,
      city: stadium.city,
      country: stadium.country,
      capacity: stadium.capacity,
      address: stadium.address || '',
      imageUrl: stadium.image_url || '',
      description: stadium.description || '',
      isActive: stadium.is_active
    });
    setShowStadiumModal(true);
  };

  const closeStadiumModal = () => {
    setShowStadiumModal(false);
    setEditingStadium(null);
    setError(null);
    setSuccess(null);
  };

  const handleStadiumInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStadiumFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked ? 1 : 0 : value
    }));
  };

  const handleStadiumSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const formData = {
        ...stadiumFormData,
        capacity: parseInt(stadiumFormData.capacity)
      };

      if (editingStadium) {
        const response = await AdminService.updateStadium(editingStadium.id, formData);
        if (response.success) {
          setSuccess('Stadium updated successfully');
          fetchStadiums();
          setTimeout(closeStadiumModal, 2000);
        }
      } else {
        const response = await AdminService.createStadium(formData);
        if (response.success) {
          setSuccess('Stadium created successfully');
          fetchStadiums();
          setTimeout(closeStadiumModal, 2000);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save stadium');
    }
  };

  const handleDeleteStadium = async (stadiumId) => {
    if (!window.confirm('Are you sure you want to deactivate this stadium?')) return;

    try {
      const response = await AdminService.deleteStadium(stadiumId);
      if (response.success) {
        setSuccess('Stadium deactivated successfully');
        fetchStadiums();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete stadium: ' + (err.message || 'Unknown error'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const openStadiumSections = async (stadium) => {
    setSelectedStadium(stadium);
    await fetchSections(stadium.id);
  };

  const closeStadiumSections = () => {
    setSelectedStadium(null);
    setSections([]);
  };

  const openCreateSectionModal = () => {
    setEditingSection(null);
    setSectionFormData({
      name: '',
      rowCount: '',
      seatsPerRow: '',
      priceMultiplier: '1.0',
      description: ''
    });
    setShowSectionModal(true);
  };

  const openEditSectionModal = (section) => {
    setEditingSection(section);
    setSectionFormData({
      name: section.name,
      rowCount: section.row_count,
      seatsPerRow: section.seats_per_row,
      priceMultiplier: section.price_multiplier,
      description: section.description || ''
    });
    setShowSectionModal(true);
  };

  const closeSectionModal = () => {
    setShowSectionModal(false);
    setEditingSection(null);
    setError(null);
    setSuccess(null);
  };

  const handleSectionInputChange = (e) => {
    const { name, value } = e.target;
    setSectionFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const formData = {
        ...sectionFormData,
        rowCount: parseInt(sectionFormData.rowCount),
        seatsPerRow: parseInt(sectionFormData.seatsPerRow),
        priceMultiplier: parseFloat(sectionFormData.priceMultiplier)
      };

      if (editingSection) {
        const response = await AdminService.updateSection(selectedStadium.id, editingSection.id, formData);
        if (response.success) {
          setSuccess('Section updated successfully');
          fetchSections(selectedStadium.id);
          setTimeout(closeSectionModal, 2000);
        }
      } else {
        const response = await AdminService.createSection(selectedStadium.id, formData);
        if (response.success) {
          setSuccess('Section created successfully');
          fetchSections(selectedStadium.id);
          setTimeout(closeSectionModal, 2000);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save section');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;

    try {
      const response = await AdminService.deleteSection(selectedStadium.id, sectionId);
      if (response.success) {
        setSuccess('Section deleted successfully');
        fetchSections(selectedStadium.id);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete section: ' + (err.message || 'Unknown error'));
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="🏟️ Stadium Management" subtitle="Manage venues and seating sections" />

      <Container className="py-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {selectedStadium ? (
          <div>
            <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
              <Button variant="secondary" onClick={closeStadiumSections}>
                ← Back to Stadiums
              </Button>
              <h2 className="h4 mb-0 flex-grow-1">
                {selectedStadium.name} - Sections
              </h2>
              <Button variant="success" onClick={openCreateSectionModal}>
                + Add Section
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" role="status" />
                <p className="text-muted mt-2 mb-0">Loading sections...</p>
              </div>
            ) : (
              <div className="table-responsive bg-white rounded shadow-sm">
                <Table hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Rows</th>
                      <th>Seats/Row</th>
                      <th>Total Seats</th>
                      <th>Price Multiplier</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map(section => (
                      <tr key={section.id}>
                        <td>{section.id}</td>
                        <td>{section.name}</td>
                        <td>{section.row_count}</td>
                        <td>{section.seats_per_row}</td>
                        <td>{section.row_count * section.seats_per_row}</td>
                        <td>x{section.price_multiplier}</td>
                        <td>{section.description || '-'}</td>
                        <td>
                          <Button size="sm" variant="primary" className="me-2" onClick={() => openEditSectionModal(section)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteSection(section.id)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {sections.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center text-muted py-4">
                          No sections found. Click &quot;Add Section&quot; to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Row className="g-3 mb-4 align-items-center">
              <Col xs={12} lg>
                <Form onSubmit={handleSearch} className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder="Search by name, city, or address..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button type="submit" variant="primary">Search</Button>
                </Form>
              </Col>
              <Col xs={12} sm={6} md={4} lg="auto">
                <Form.Select value={selectedCity} onChange={handleCityFilter}>
                  <option value="">All Cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
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
                <Spinner animation="border" role="status" />
                <p className="text-muted mt-2 mb-0">Loading stadiums...</p>
              </div>
            ) : (
              <>
                <div className="table-responsive bg-white rounded shadow-sm">
                  <Table hover className="mb-0 align-middle">
                    <thead className="table-light">
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
                          <td>{stadium.id}</td>
                          <td>{stadium.name}</td>
                          <td>{stadium.city}</td>
                          <td>{stadium.country}</td>
                          <td>{stadium.capacity.toLocaleString()}</td>
                          <td>
                            <Badge bg={stadium.is_active ? 'success' : 'danger'}>
                              {stadium.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td>
                            <Button size="sm" variant="primary" className="me-1 mb-1" onClick={() => openStadiumSections(stadium)}>
                              Sections
                            </Button>
                            <Button size="sm" variant="primary" className="me-1 mb-1" onClick={() => openEditStadiumModal(stadium)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="danger" className="mb-1" onClick={() => handleDeleteStadium(stadium.id)}>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {stadiums.length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">
                            No stadiums found. Click &quot;Add Stadium&quot; to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>

                <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                  <Button
                    variant="primary"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-muted">
                    Page {pagination.page} of {pagination.totalPages}
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

      <Modal show={showStadiumModal} onHide={closeStadiumModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingStadium ? 'Edit Stadium' : 'Create New Stadium'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleStadiumSubmit}>
          <Modal.Body>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control type="text" name="name" value={stadiumFormData.name} onChange={handleStadiumInputChange} required />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>City *</Form.Label>
                  <Form.Control type="text" name="city" value={stadiumFormData.city} onChange={handleStadiumInputChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Country *</Form.Label>
                  <Form.Control type="text" name="country" value={stadiumFormData.country} onChange={handleStadiumInputChange} required />
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
              <Form.Control type="text" name="address" value={stadiumFormData.address} onChange={handleStadiumInputChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Image URL</Form.Label>
              <Form.Control type="url" name="imageUrl" value={stadiumFormData.imageUrl} onChange={handleStadiumInputChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={stadiumFormData.description} onChange={handleStadiumInputChange} />
            </Form.Group>
            <Form.Check
              type="checkbox"
              name="isActive"
              id="stadiumActive"
              label="Active Stadium"
              checked={stadiumFormData.isActive === 1}
              onChange={handleStadiumInputChange}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeStadiumModal}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingStadium ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showSectionModal} onHide={closeSectionModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingSection ? 'Edit Section' : 'Create New Section'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSectionSubmit}>
          <Modal.Body>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control type="text" name="name" value={sectionFormData.name} onChange={handleSectionInputChange} required />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price Multiplier</Form.Label>
                  <Form.Control type="number" name="priceMultiplier" value={sectionFormData.priceMultiplier} onChange={handleSectionInputChange} step="0.1" min="0.1" />
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
              <Form.Control as="textarea" rows={3} name="description" value={sectionFormData.description} onChange={handleSectionInputChange} />
            </Form.Group>
            <Alert variant="light" className="mb-0">
              Total Seats: <strong>{(parseInt(sectionFormData.rowCount) || 0) * (parseInt(sectionFormData.seatsPerRow) || 0)}</strong>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeSectionModal}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingSection ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminStadiums;
