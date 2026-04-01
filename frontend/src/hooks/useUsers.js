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
      const data = await userService.getAllUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
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

  const updateUser = async (id, userData) => {
    try {
      const updatedUser = await userService.updateUser(id, userData);
      setUsers(users.map(user => user._id === id ? updatedUser : user));
      return updatedUser;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const removeUser = async (id) => {
    try {
      await userService.deleteUser(id);
      setUsers(users.filter(user => user._id !== id));
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
    updateUser,
    removeUser,
    refetch: fetchUsers
  };
};

export default useUsers;