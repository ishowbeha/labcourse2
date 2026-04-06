import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminService from '../services/AdminService';

const AdminUsers = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [rolesLoaded, setRolesLoaded] = useState(false);
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
  }, [pagination.page, search, selectedRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await AdminService.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: selectedRole
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
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchUsers();
  };

  const handleRoleFilter = (e) => {
    setSelectedRole(e.target.value);
    setPagination({ ...pagination, page: 1 });
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
    // Map role names to role IDs using the fetched roles list
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
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>👥 User Management</h1>
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
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {error && <div style={styles.alertError}>{error}</div>}
        {success && <div style={styles.alertSuccess}>{success}</div>}

        {/* Filters */}
        <div style={styles.filters}>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            <button type="submit" style={styles.searchBtn}>Search</button>
          </form>
          <select
            value={selectedRole}
            onChange={handleRoleFilter}
            style={styles.roleSelect}
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role.id} value={role.name}>{role.description}</option>
            ))}
          </select>
          <button onClick={openCreateModal} style={styles.createBtn}>
            + Add User
          </button>
        </div>

        {/* Users Table */}
        {loading ? (
          <div style={styles.loading}>Loading users...</div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Roles</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(userItem => (
                  <tr key={userItem.id}>
                    <td style={styles.td}>{userItem.id}</td>
                    <td style={styles.td}>{userItem.first_name} {userItem.last_name}</td>
                    <td style={styles.td}>{userItem.email}</td>
                    <td style={styles.td}>
                      {userItem.roles?.map(role => (
                        <span key={role} style={styles.roleBadge}>{role}</span>
                      ))}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: userItem.is_active ? '#2ecc71' : '#e74c3c'
                      }}>
                        {userItem.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>{new Date(userItem.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => openEditModal(userItem)}
                        style={styles.actionBtn}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(userItem.id)}
                        style={{ ...styles.actionBtn, backgroundColor: '#e74c3c' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
      </main>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {editingUser ? 'Edit User' : 'Create New User'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>
              {!editingUser && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  />
                </div>
              )}
              <div style={styles.formGroup}>
                <label style={styles.label}>Roles</label>
                <div style={styles.checkboxGroup}>
                  {roles.map(role => (
                    <label key={role.id} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.roleIds.includes(role.id)}
                        onChange={() => handleRoleChange(role.id)}
                        style={styles.checkbox}
                      />
                      {role.description}
                    </label>
                  ))}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive === 1}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  Active User
                </label>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingUser ? 'Update' : 'Create'}
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
  roleBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#e8f4fd',
    color: '#3498db',
    borderRadius: '4px',
    fontSize: '12px',
    marginRight: '4px',
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
    maxWidth: '500px',
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
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
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
};

export default AdminUsers;