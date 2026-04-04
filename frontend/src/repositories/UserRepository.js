import api from '../services/api';

class UserRepository {
  async getAllUsers() {
    try {
      const response = await api.get('/users');
      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch users'
      };
    }
  }

  async getUserById(id) {
    try {
      const response = await api.get(`/users/${id}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch user'
      };
    }
  }

  async createUser(userData) {
    try {
      const response = await api.post('/users', userData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to create user'
      };
    }
  }

  async updateUser(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to update user'
      };
    }
  }

  async deleteUser(id) {
    try {
      await api.delete(`/users/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to delete user'
      };
    }
  }
}

export default UserRepository;