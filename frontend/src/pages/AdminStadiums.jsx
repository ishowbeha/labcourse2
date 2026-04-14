import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import useResponsiveStyles from '../hooks/useResponsiveStyles';

const AdminStadiums = () => {
  const screenSize = useResponsiveStyles();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Stadium state
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

  // Section state
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

  // Stadium CRUD operations
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

  // Section CRUD operations
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
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>🏟️ Stadium Management</h1>
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

        {/* If viewing sections of a stadium */}
        {selectedStadium ? (
          <div>
            <div style={styles.sectionHeader}>
              <button onClick={closeStadiumSections} style={styles.backBtn}>
                ← Back to Stadiums
              </button>
              <h2 style={styles.sectionTitle}>
                {selectedStadium.name} - Sections
              </h2>
              <button onClick={openCreateSectionModal} style={styles.createBtn}>
                + Add Section
              </button>
            </div>

            {loading ? (
              <div style={styles.loading}>Loading sections...</div>
            ) : (
              <>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Rows</th>
                        <th style={styles.th}>Seats/Row</th>
                        <th style={styles.th}>Total Seats</th>
                        <th style={styles.th}>Price Multiplier</th>
                        <th style={styles.th}>Description</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map(section => (
                        <tr key={section.id}>
                          <td style={styles.td}>{section.id}</td>
                          <td style={styles.td}>{section.name}</td>
                          <td style={styles.td}>{section.row_count}</td>
                          <td style={styles.td}>{section.seats_per_row}</td>
                          <td style={styles.td}>{section.row_count * section.seats_per_row}</td>
                          <td style={styles.td}>x{section.price_multiplier}</td>
                          <td style={styles.td}>{section.description || '-'}</td>
                          <td style={styles.td}>
                            <button
                              onClick={() => openEditSectionModal(section)}
                              style={styles.actionBtn}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section.id)}
                              style={{ ...styles.actionBtn, backgroundColor: '#e74c3c' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sections.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ ...styles.td, textAlign: 'center' }}>
                            No sections found. Click "Add Section" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Stadium List View */
          <div>
            {/* Filters */}
            <div style={screenSize === 'mobile' ? responsiveStyles.mobile.filters : screenSize === 'tablet' ? responsiveStyles.tablet.filters : styles.filters}>
              <form onSubmit={handleSearch} style={styles.searchForm}>
                <input
                  type="text"
                  placeholder="Search by name, city, or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                />
                <button type="submit" style={styles.searchBtn}>Search</button>
              </form>
              <select
                value={selectedCity}
                onChange={handleCityFilter}
                style={styles.roleSelect}
              >
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <button onClick={openCreateStadiumModal} style={styles.createBtn}>
                + Add Stadium
              </button>
            </div>

            {/* Stadiums Table */}
            {loading ? (
              <div style={styles.loading}>Loading stadiums...</div>
            ) : (
              <>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>City</th>
                        <th style={styles.th}>Country</th>
                        <th style={styles.th}>Capacity</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stadiums.map(stadium => (
                        <tr key={stadium.id}>
                          <td style={styles.td}>{stadium.id}</td>
                          <td style={styles.td}>{stadium.name}</td>
                          <td style={styles.td}>{stadium.city}</td>
                          <td style={styles.td}>{stadium.country}</td>
                          <td style={styles.td}>{stadium.capacity.toLocaleString()}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: stadium.is_active ? '#2ecc71' : '#e74c3c'
                            }}>
                              {stadium.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => openStadiumSections(stadium)}
                              style={styles.actionBtn}
                            >
                              Sections
                            </button>
                            <button
                              onClick={() => openEditStadiumModal(stadium)}
                              style={styles.actionBtn}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStadium(stadium.id)}
                              style={{ ...styles.actionBtn, backgroundColor: '#e74c3c' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {stadiums.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ ...styles.td, textAlign: 'center' }}>
                            No stadiums found. Click "Add Stadium" to create one.
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
                    Page {pagination.page} of {pagination.totalPages}
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

      {/* Stadium Modal */}
      {showStadiumModal && (
        <div style={styles.modalOverlay} onClick={closeStadiumModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editingStadium ? 'Edit Stadium' : 'Create New Stadium'}
            </h2>
            <form onSubmit={handleStadiumSubmit}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={stadiumFormData.name}
                    onChange={handleStadiumInputChange}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={stadiumFormData.city}
                    onChange={handleStadiumInputChange}
                    required
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Country *</label>
                  <input
                    type="text"
                    name="country"
                    value={stadiumFormData.country}
                    onChange={handleStadiumInputChange}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Capacity *</label>
                  <input
                    type="number"
                    name="capacity"
                    value={stadiumFormData.capacity}
                    onChange={handleStadiumInputChange}
                    required
                    min="1"
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Address</label>
                <input
                  type="text"
                  name="address"
                  value={stadiumFormData.address}
                  onChange={handleStadiumInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Image URL</label>
                <input
                  type="url"
                  name="imageUrl"
                  value={stadiumFormData.imageUrl}
                  onChange={handleStadiumInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={stadiumFormData.description}
                  onChange={handleStadiumInputChange}
                  rows="3"
                  style={{ ...styles.input, resize: 'vertical' }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={stadiumFormData.isActive === 1}
                    onChange={handleStadiumInputChange}
                    style={styles.checkbox}
                  />
                  Active Stadium
                </label>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={closeStadiumModal} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingStadium ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <div style={styles.modalOverlay} onClick={closeSectionModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editingSection ? 'Edit Section' : 'Create New Section'}
            </h2>
            <form onSubmit={handleSectionSubmit}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={sectionFormData.name}
                    onChange={handleSectionInputChange}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Price Multiplier</label>
                  <input
                    type="number"
                    name="priceMultiplier"
                    value={sectionFormData.priceMultiplier}
                    onChange={handleSectionInputChange}
                    step="0.1"
                    min="0.1"
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Number of Rows *</label>
                  <input
                    type="number"
                    name="rowCount"
                    value={sectionFormData.rowCount}
                    onChange={handleSectionInputChange}
                    required
                    min="1"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Seats per Row *</label>
                  <input
                    type="number"
                    name="seatsPerRow"
                    value={sectionFormData.seatsPerRow}
                    onChange={handleSectionInputChange}
                    required
                    min="1"
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={sectionFormData.description}
                  onChange={handleSectionInputChange}
                  rows="3"
                  style={{ ...styles.input, resize: 'vertical' }}
                />
              </div>
              <div style={styles.formGroup}>
                <p style={styles.totalSeats}>
                  Total Seats: <strong>{(parseInt(sectionFormData.rowCount) || 0) * (parseInt(sectionFormData.seatsPerRow) || 0)}</strong>
                </p>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={closeSectionModal} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingSection ? 'Update' : 'Create'}
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
    gap: '16px',
    marginBottom: '24px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    minWidth: '300px',
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
  roleSelect: {
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
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
  table: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    fontWeight: '600',
    fontSize: '14px',
    color: '#555',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    borderBottom: '1px solid #eee',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
  },
  actionBtn: {
    padding: '6px 12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '8px',
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
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    color: '#2c3e50',
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  totalSeats: {
    fontSize: '14px',
    color: '#555',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
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
  },
  sectionHeader: {
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
  sectionTitle: {
    margin: '0',
    fontSize: '20px',
    color: '#2c3e50',
    flex: 1,
  },
  tableContainer: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
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

export default AdminStadiums;