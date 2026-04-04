import React from 'react';
import useUsers from '../hooks/useUsers';

const UserList = () => {
  const { users, loading, error, removeUser } = useUsers();

  if (loading) return <div style={styles.loading}>Loading users...</div>;
  if (error) {
    console.error('UserList error:', error);
    return (
      <div style={styles.errorContainer}>
        <p style={styles.error}>Unable to load users: {error}</p>
        <p style={styles.errorHint}>Make sure you're logged in with a valid account.</p>
      </div>
    );
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await removeUser(id);
      } catch (err) {
        alert('Failed to delete user: ' + err.message);
      }
    }
  };

  if (!users || users.length === 0) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Users</h2>
        <p style={styles.empty}>No users found.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Users</h2>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={styles.td}>
                  {user.first_name} {user.last_name}
                </td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: user.is_active ? '#27ae60' : '#e74c3c'
                  }}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    color: '#2c3e50',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #ddd',
    backgroundColor: '#f8f9fa',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #eee',
    fontSize: '14px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'white',
    fontWeight: '500',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#7f8c8d',
  },
  error: {
    color: '#e74c3c',
    fontSize: '14px',
    marginBottom: '8px',
  },
  errorHint: {
    color: '#7f8c8d',
    fontSize: '13px',
  },
  errorContainer: {
    padding: '20px',
    backgroundColor: '#fdf2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  empty: {
    color: '#7f8c8d',
    fontSize: '14px',
    padding: '20px',
    textAlign: 'center',
  },
};

export default UserList;