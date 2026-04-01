import React from 'react';
import useUsers from '../hooks/useUsers';

const UserList = () => {
  const { users, loading, error, removeUser } = useUsers();

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await removeUser(id);
      } catch (err) {
        alert('Failed to delete user: ' + err.message);
      }
    }
  };

  return (
    <div className="card">
      <h2>Users</h2>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td style={tdStyle}>{user.username}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>{user.role}</td>
                <td style={tdStyle}>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(user._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const thStyle = {
  textAlign: 'left',
  padding: '10px',
  borderBottom: '2px solid #ddd',
  backgroundColor: '#f8f9fa'
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #ddd'
};

export default UserList;