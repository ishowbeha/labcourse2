import UserRepository from '../repositories/UserRepository';

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAllUsers() {
    try {
      const result = await this.userRepository.getAllUsers();
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to fetch users');
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch users');
    }
  }

  async getUserById(id) {
    try {
      const result = await this.userRepository.getUserById(id);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to fetch user');
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch user');
    }
  }

  async createUser(userData) {
    try {
      const result = await this.userRepository.createUser(userData);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to create user');
    } catch (error) {
      throw new Error(error.message || 'Failed to create user');
    }
  }

  async updateUser(id, userData) {
    try {
      const result = await this.userRepository.updateUser(id, userData);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to update user');
    } catch (error) {
      throw new Error(error.message || 'Failed to update user');
    }
  }

  async deleteUser(id) {
    try {
      const result = await this.userRepository.deleteUser(id);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to delete user');
    } catch (error) {
      throw new Error(error.message || 'Failed to delete user');
    }
  }

  async login(email, password) {
    try {
      const result = await this.userRepository.login(email, password);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.message || 'Login failed');
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }
}

export default UserService;