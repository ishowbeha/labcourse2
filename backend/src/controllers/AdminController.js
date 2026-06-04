const AdminService = require('../services/AdminService');

class AdminController {
  constructor(db) {
    this.db = db;
    this.service = new AdminService(db);
  }

  // Dashboard Statistics
  async getDashboardStats(req, res, next) {
    try {
      const stats = await this.service.getDashboardStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // User Management
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 10, search = '', role = '' } = req.query;
      const result = await this.service.getAllUsers(
        parseInt(page),
        parseInt(limit),
        search,
        role
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await this.service.getUserById(id);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const { firstName, lastName, email, password, roleIds = [] } = req.body;
      const createdBy = req.user?.id || 1; // Default to system admin

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, email, and password are required'
        });
      }

      const user = await this.service.createUser(
        { firstName, lastName, email, password, roleIds },
        createdBy
      );

      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, isActive, roleIds } = req.body;
      const updatedBy = req.user?.id || 1;

      const user = await this.service.updateUser(
        id,
        { firstName, lastName, email, isActive, roleIds },
        updatedBy
      );

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await this.service.deleteUser(id);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async hardDeleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.hardDeleteUser(id);
      res.json({
        success: true,
        message: 'User permanently deleted'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllRoles(req, res, next) {
    try {
      const roles = await this.service.getAllRoles();
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  // Reports - Ticket Sales by Match
  async getTicketSalesByMatch(req, res, next) {
    try {
      const sales = await this.service.getTicketSalesByMatch();
      res.json({
        success: true,
        data: sales
      });
    } catch (error) {
      next(error);
    }
  }

  // Reports - Orders
  async getOrders(req, res, next) {
    try {
      const { page = 1, limit = 10, status = '' } = req.query;
      const result = await this.service.getOrdersWithDetails(
        parseInt(page),
        parseInt(limit),
        status
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = await this.service.getOrderById(id);
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updatedBy = req.user?.id || 1;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const order = await this.service.updateOrderStatus(id, status, updatedBy);
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  // Reports - Revenue Analytics
  async getRevenueAnalytics(req, res, next) {
    try {
      const { period = 'monthly' } = req.query;
      const analytics = await this.service.getRevenueAnalytics(period);
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  // Reports - Top Selling Matches
  async getTopSellingMatches(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const matches = await this.service.getTopSellingMatches(parseInt(limit));
      res.json({
        success: true,
        data: matches
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete order
  async deleteOrder(req, res, next) {
    try {
      const orderId = req.params.id;
      await this.service.deleteOrder(orderId);
      res.json({
        success: true,
        message: 'Order deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/reports/dynamic - Dynamic report generation
  async generateDynamicReport(req, res, next) {
    try {
      const { dateFrom, dateTo, metrics = ['tickets_sold', 'revenue'], groupBy = 'none', filters = {} } = req.body;
      const result = await this.service.generateDynamicReport({ dateFrom, dateTo, metrics, groupBy, filters });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
