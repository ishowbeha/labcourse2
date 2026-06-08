import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Form, Button, Alert, Table, Badge, Modal, Spinner,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';
import LazyAdminNavbar from '../components/layout/LazyAdminNavbar';
import AdvancedSearchBar from '../components/search/AdvancedSearchBar';

const AdminUsers = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [advFilters, setAdvFilters] = useState({});
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const userSortOptions = [
    { value: 'firstName', label: 'First Name' },
    { value: 'email', label: 'Email' },
    { value: 'createdAt', label: 'Date Registered' },
    { value: 'isActive', label: 'Status' },
  ];

  const userFilterDefs = [
    { id: 'role', label: 'Role', type: 'select',
      options: roles.map(r => ({ value: r.name, label: r.description || r.name })),
      placeholder: 'All Roles',
    },
    { id: 'isActive', label: 'Status', type: 'select', options: [
      { value: '1', label: 'Active' },
      { value: '0', label: 'Inactive' },
    ]},
    { id: 'dateFrom', label: 'Registered From', type: 'date' },
    { id: 'dateTo', label: 'Registered To', type: 'date' },
  ];
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleIds: [],
    isActive: 1
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/home');
      return;
    }
    fetchUsers();
    fetchRoles();
  }, [pagination.page, search, selectedRole, advFilters, sortField, sortDir]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: advFilters.role || selectedRole,
        ...(advFilters.isActive !== '' && advFilters.isActive !== undefined ? { isActive: advFilters.isActive } : {}),
        ...(advFilters.dateFrom ? { dateFrom: advFilters.dateFrom } : {}),
        ...(advFilters.dateTo ? { dateTo: advFilters.dateTo } : {}),
        ...(sortField ? { sortBy: sortField, sortDir } : {}),
      });
      console.log('AdminUsers fetchUsers response:', response);
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setPagination({
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          totalPages: response.data.totalPages
        });
      } else {
        console.warn('Unexpected response format:', response);
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await AdminService.getRoles();
      if (response.success) {
        setRoles(response.data);
        setRolesLoaded(true);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
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
    setPagination({ ...pagination, page: 1 });
    fetchUsers();
  };

  const handleRoleFilter = (e) => {
    setSelectedRole(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const handleAdvFilterChange = (id, value) => {
    setAdvFilters((prev) => ({ ...prev, [id]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleAdvReset = () => {
    setSearch('');
    setSelectedRole('');
    setAdvFilters({});
    setSortField('');
    setSortDir('asc');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      roleIds: [],
      isActive: 1
    });
    setShowModal(true);
  };

  const openEditModal = (userItem) => {
    if (!rolesLoaded) {
      setError('Roles are still loading. Please try again in a moment.');
      return;
    }
    setEditingUser(userItem);
    const userRoleNames = userItem.roles || [];
    const mappedRoleIds = userRoleNames
      .map(roleName => {
        const role = roles.find(r => r.name === roleName);
        return role ? role.id : null;
      })
      .filter(id => id !== null);
    setFormData({
      firstName: userItem.first_name,
      lastName: userItem.last_name,
      email: userItem.email,
      password: '',
      roleIds: mappedRoleIds,
      isActive: userItem.is_active
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked ? 1 : 0 : value
    }));
  };

  const handleRoleChange = (roleId) => {
    setFormData(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingUser) {
        const response = await AdminService.updateUser(editingUser.id, formData);
        if (response.success) {
          setSuccess('User updated successfully');
          fetchUsers();
          setTimeout(closeModal, 2000);
        }
      } else {
        if (!formData.password) {
          setError('Password is required for new users');
          return;
        }
        const response = await AdminService.createUser(formData);
        if (response.success) {
          setSuccess('User created successfully');
          fetchUsers();
          setTimeout(closeModal, 2000);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const response = await AdminService.deleteUser(userId);
      if (response.success) {
        setSuccess('User deactivated successfully');
        fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete user');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="min-vh-100 bg-light">
      <LazyAdminNavbar title="👥 User Management" subtitle="Manage user accounts and roles" />

      <Container className="py-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {/* Advanced Search Bar */}
        <div className="mb-4">
          <AdvancedSearchBar
            searchValue={search}
            onSearchChange={setSearch}
            onSearch={handleSearch}
            onReset={handleAdvReset}
            placeholder="Search by name or email…"
            filters={userFilterDefs}
            filterValues={advFilters}
            onFilterChange={handleAdvFilterChange}
            sortOptions={userSortOptions}
            sortValue={sortField}
            sortDir={sortDir}
            onSortChange={(f, d) => { setSortField(f); setSortDir(d); setPagination(p => ({...p, page:1})); }}
            resultCount={pagination.total}
          />
        </div>
        <div className="d-flex justify-content-end mb-3">
          <Button variant="success" onClick={openCreateModal}>
            + Add User
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" />
            <p className="text-muted mt-2 mb-0">Loading users...</p>
          </div>
        ) : (
          <>
            <div className="table-responsive bg-white rounded shadow-sm">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(userItem => (
                    <tr key={userItem.id}>
                      <td>{userItem.id}</td>
                      <td>{userItem.first_name} {userItem.last_name}</td>
                      <td>{userItem.email}</td>
                      <td>
                        {userItem.roles?.map(role => (
                          <Badge key={role} bg="info" className="me-1">{role}</Badge>
                        ))}
                      </td>
                      <td>
                        <Badge bg={userItem.is_active ? 'success' : 'danger'}>
                          {userItem.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>{new Date(userItem.created_at).toLocaleDateString()}</td>
                      <td>
                        <Button size="sm" variant="primary" className="me-2" onClick={() => openEditModal(userItem)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteUser(userItem.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
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
      </Container>

      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingUser ? 'Edit User' : 'Create New User'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            {!editingUser && (
              <Form.Group className="mb-3">
                <Form.Label>Password *</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Roles</Form.Label>
              <div className="d-flex flex-wrap gap-3">
                {roles.map(role => (
                  <Form.Check
                    key={role.id}
                    type="checkbox"
                    id={`role-${role.id}`}
                    label={role.description}
                    checked={formData.roleIds.includes(role.id)}
                    onChange={() => handleRoleChange(role.id)}
                  />
                ))}
              </div>
            </Form.Group>
            <Form.Check
              type="checkbox"
              name="isActive"
              id="isActive"
              label="Active User"
              checked={formData.isActive === 1}
              onChange={handleInputChange}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;
