import React from 'react';
import { Table, Badge, Alert } from 'react-bootstrap';
import useUsers from '../hooks/useUsers';

const UserList = () => {
  const { users, loading, error } = useUsers();

  if (loading) return <div className="text-center text-muted p-4">Loading users...</div>;
  if (error) {
    console.error('UserList error:', error);
    return (
      <Alert variant="danger">
        <p className="mb-1">Unable to load users: {error}</p>
        <p className="mb-0 small">Make sure you&apos;re logged in with a valid account.</p>
      </Alert>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div>
        <h2 className="h5 mb-3">Users</h2>
        <p className="text-center text-muted p-4">No users found.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="h5 mb-3">Users</h2>
      <div className="table-responsive">
        <Table hover className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>
                  <Badge bg={user.is_active ? 'success' : 'danger'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default UserList;
