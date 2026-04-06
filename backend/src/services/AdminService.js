const bcrypt = require('bcryptjs');
const AdminRepository = require('../repositories/AdminRepository');

class AdminService {
  constructor(db) {
    this.db = db;
    this.repository = new AdminRepository(db);
  }

  // Dashboard Statistics
  async getDashboardStats() {
    try {
      return this.repository.getDashboardStats();
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
  }

  // User Management
  async getAllUsers(page = 1, limit = 10, search = '', role = '') {
    try {
      return this.repository.getAllUsers(page, limit, search, role);
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async getUserById(id) {
    try {
      const user = this.repository.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  async createUser(userData, createdBy) {
    try {
      // Check if email already exists
      const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ?').get(userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      
      const user = this.repository.createUser({
        ...userData,
        password: hashedPassword
      }, createdBy);

      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async updateUser(id, userData, updatedBy) {
    try {
      // Check if user exists
      const existingUser = this.repository.getUserById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check if email is being changed and if it's already taken
      if (userData.email && userData.email !== existingUser.email) {
        const emailTaken = this.db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(userData.email, id);
        if (emailTaken) {
          throw new Error('Email already exists');
        }
      }

      return this.repository.updateUser(id, userData, updatedBy);
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async deleteUser(id) {
    try {
      const user = this.repository.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }

      return this.repository.deleteUser(id);
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async hardDeleteUser(id) {
    try {
      return this.repository.hardDeleteUser(id);
    } catch (error) {
      throw new Error(`Failed to hard delete user: ${error.message}`);
    }
  }

  async getAllRoles() {
    try {
      return this.repository.getAllRoles();
    } catch (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  // Reports
  async getTicketSalesByMatch() {
    try {
      return this.repository.getTicketSalesByMatch();
    } catch (error) {
      throw new Error(`Failed to fetch ticket sales: ${error.message}`);
    }
  }

  async getOrdersWithDetails(page = 1, limit = 10, status = '') {
    try {
      return this.repository.getOrdersWithDetails(page, limit, status);
    } catch (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
  }

  async getOrderById(id) {
    try {
      const order = this.repository.getOrderById(id);
      if (!order) {
        throw new Error('Order not found');
      }
      return order;
    } catch (error) {
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  async updateOrderStatus(id, status, updatedBy) {
    try {
      const order = this.repository.getOrderById(id);
      if (!order) {
        throw new Error('Order not found');
      }

      return this.repository.updateOrderStatus(id, status, updatedBy);
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  async getRevenueAnalytics(period = 'monthly') {
    try {
      return this.repository.getRevenueAnalytics(period);
    } catch (error) {
      throw new Error(`Failed to fetch revenue analytics: ${error.message}`);
    }
  }

  async getTopSellingMatches(limit = 10) {
    try {
      return this.repository.getTopSellingMatches(limit);
    } catch (error) {
      throw new Error(`Failed to fetch top selling matches: ${error.message}`);
    }
  }
}

module.exports = AdminService;