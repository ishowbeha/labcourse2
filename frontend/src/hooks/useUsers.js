import { useState, useEffect } from 'react';
import UserService from '../services/UserService';

const userService = new UserService();

const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userData) => {
    try {
      const newUser = await userService.createUser(userData);
      setUsers([...users, newUser]);
      return newUser;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const removeUser = async (id) => {
    try {
      await userService.deleteUser(id);
      setUsers(users.filter(user => user.id !== id));
    } catch (err) {
      throw new Error(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    addUser,
    removeUser,
    refetch: fetchUsers
  };
};

export default useUsers;