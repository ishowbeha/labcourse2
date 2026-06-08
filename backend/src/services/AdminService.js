const bcrypt = require('bcryptjs');
const AdminRepository = require('../repositories/AdminRepository');

class AdminService {
  constructor(pool) {
    this.pool = pool;
    this.repository = new AdminRepository(pool);
  }

  // Dashboard Statistics
  async getDashboardStats() {
    try {
      return await this.repository.getDashboardStats();
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
  }

  // User Management
  async getAllUsers(page = 1, limit = 10, search = '', role = '', options = {}) {
    try {
      return await this.repository.getAllUsers(page, limit, search, role, options);
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async getUserById(id) {
    try {
      const user = await this.repository.getUserById(id);
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
      const [existing] = await this.pool.query('SELECT id FROM users WHERE email = ?', [userData.email]);
      if (existing.length > 0) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = bcrypt.hashSync(userData.password, 10);

      const user = await this.repository.createUser({
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
      const existingUser = await this.repository.getUserById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check if email is being changed and if it's already taken
      if (userData.email && userData.email !== existingUser.email) {
        const [emailTaken] = await this.pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [userData.email, id]);
        if (emailTaken.length > 0) {
          throw new Error('Email already exists');
        }
      }

      return await this.repository.updateUser(id, userData, updatedBy);
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async deleteUser(id) {
    try {
      const user = await this.repository.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }

      return await this.repository.deleteUser(id);
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async hardDeleteUser(id) {
    try {
      return await this.repository.hardDeleteUser(id);
    } catch (error) {
      throw new Error(`Failed to hard delete user: ${error.message}`);
    }
  }

  async getAllRoles() {
    try {
      return await this.repository.getAllRoles();
    } catch (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  // Reports
  async getTicketSalesByMatch() {
    try {
      return await this.repository.getTicketSalesByMatch();
    } catch (error) {
      throw new Error(`Failed to fetch ticket sales: ${error.message}`);
    }
  }

  async getOrdersWithDetails(page = 1, limit = 10, status = '', search = '', options = {}) {
    try {
      return await this.repository.getOrdersWithDetails(page, limit, status, search, options);
    } catch (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
  }

  async getOrderById(id) {
    try {
      const order = await this.repository.getOrderById(id);
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
      const order = await this.repository.getOrderById(id);
      if (!order) {
        throw new Error('Order not found');
      }

      return await this.repository.updateOrderStatus(id, status, updatedBy);
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  async getRevenueAnalytics(period = 'monthly') {
    try {
      return await this.repository.getRevenueAnalytics(period);
    } catch (error) {
      throw new Error(`Failed to fetch revenue analytics: ${error.message}`);
    }
  }

  async getTopSellingMatches(limit = 10) {
    try {
      return await this.repository.getTopSellingMatches(limit);
    } catch (error) {
      throw new Error(`Failed to fetch top selling matches: ${error.message}`);
    }
  }

  async refundOrder(id, reason = '') {
    try {
      const result = await this.repository.refundOrder(id, reason);
      if (!result) {
        throw new Error('Order not found');
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to refund order: ${error.message}`);
    }
  }

  async hardDeleteOrder(id) {
    try {
      const result = await this.repository.hardDeleteOrder(id);
      if (!result) {
        throw new Error('Order not found');
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  }

  // Dynamic Report Generation
  async generateDynamicReport({ dateFrom, dateTo, metrics = ['tickets_sold', 'revenue'], groupBy = 'none', filters = {} }) {
    try {
      const selects = [];
      const selectParams = [];
      const whereParams = [];
      const joins = new Set();
      const wheres = [];

      // Determine which joins are needed
      const needMatches = groupBy === 'match' || groupBy === 'stadium' || filters.stadiumId;
      const needStadiums = groupBy === 'stadium';

      if (needMatches) {
        joins.add('LEFT JOIN tickets t ON oi.ticket_id = t.id');
        joins.add('LEFT JOIN matches m ON t.match_id = m.id');
      }
      if (needStadiums) {
        joins.add('LEFT JOIN stadiums s ON m.stadium_id = s.id');
      }

      // Build SELECT columns based on metrics
      if (metrics.includes('tickets_sold')) {
        selects.push('COALESCE(SUM(oi.quantity), 0) as tickets_sold');
      }
      if (metrics.includes('revenue')) {
        selects.push('COALESCE(SUM(o.total_amount), 0) as revenue');
      }
      if (metrics.includes('orders_count')) {
        selects.push('COUNT(DISTINCT o.id) as orders_count');
      }
      if (metrics.includes('avg_order_value')) {
        selects.push('COALESCE(AVG(o.total_amount), 0) as avg_order_value');
      }
      if (metrics.includes('cancellations')) {
        selects.push('SUM(CASE WHEN o.status = "cancelled" THEN 1 ELSE 0 END) as cancellations');
      }
      if (metrics.includes('registrations')) {
        if (groupBy === 'day') {
          selects.push('(SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE(o.created_at)) as registrations');
        } else if (groupBy === 'month') {
          selects.push('(SELECT COUNT(*) FROM users WHERE DATE_FORMAT(created_at, "%Y-%m") = DATE_FORMAT(o.created_at, "%Y-%m")) as registrations');
        } else {
          selects.push('(SELECT COUNT(*) FROM users WHERE created_at BETWEEN ? AND ?) as registrations');
          selectParams.push(dateFrom || '2020-01-01', (dateTo || '2030-01-01') + ' 23:59:59');
        }
      }
      if (metrics.includes('logins')) {
        if (groupBy === 'day') {
          selects.push('(SELECT COUNT(*) FROM audit_logs WHERE action = "login" AND DATE(created_at) = DATE(o.created_at)) as logins');
        } else if (groupBy === 'month') {
          selects.push('(SELECT COUNT(*) FROM audit_logs WHERE action = "login" AND DATE_FORMAT(created_at, "%Y-%m") = DATE_FORMAT(o.created_at, "%Y-%m")) as logins');
        } else {
          selects.push('(SELECT COUNT(*) FROM audit_logs WHERE action = "login" AND created_at BETWEEN ? AND ?) as logins');
          selectParams.push(dateFrom || '2020-01-01', (dateTo || '2030-01-01') + ' 23:59:59');
        }
      }

      // GROUP BY
      let groupBySql = '';
      let selectGroupBy = '';
      if (groupBy === 'match') {
        selectGroupBy = 'CONCAT(m.home_team, " vs ", m.away_team) as label';
        groupBySql = 'GROUP BY m.id, m.home_team, m.away_team ORDER BY label ASC';
      } else if (groupBy === 'stadium') {
        selectGroupBy = 's.name as label';
        groupBySql = 'GROUP BY s.id, s.name ORDER BY label ASC';
      } else if (groupBy === 'day') {
        selectGroupBy = 'DATE(o.created_at) as label';
        groupBySql = 'GROUP BY DATE(o.created_at) ORDER BY label ASC';
      } else if (groupBy === 'month') {
        selectGroupBy = 'DATE_FORMAT(o.created_at, "%Y-%m") as label';
        groupBySql = 'GROUP BY DATE_FORMAT(o.created_at, "%Y-%m") ORDER BY label ASC';
      } else {
        selectGroupBy = '"Total" as label';
      }

      // Date filter
      if (dateFrom) {
        wheres.push('o.created_at >= ?');
        whereParams.push(dateFrom);
      }
      if (dateTo) {
        wheres.push('o.created_at <= ?');
        whereParams.push(dateTo + ' 23:59:59');
      }

      // Additional filters
      if (filters.stadiumId) {
        wheres.push('m.stadium_id = ?');
        whereParams.push(filters.stadiumId);
      }
      if (filters.status) {
        wheres.push('o.status = ?');
        whereParams.push(filters.status);
      }

      const whereClause = wheres.length > 0 ? 'WHERE ' + wheres.join(' AND ') : '';

      if (selects.length === 0) {
        selects.push('COALESCE(SUM(oi.quantity), 0) as tickets_sold', 'COALESCE(SUM(o.total_amount), 0) as revenue');
      }

      // Only run order-based query if we have order metrics or any grouping
      const hasOrderMetrics = groupBy !== 'none' || metrics.some(m => ['tickets_sold', 'revenue', 'orders_count', 'avg_order_value', 'cancellations'].includes(m));

      let rows = [];
      if (hasOrderMetrics) {
        const sql = `
          SELECT ${selectGroupBy}, ${selects.join(', ')}
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          ${Array.from(joins).join(' ')}
          ${whereClause}
          ${groupBySql}
        `;
        [rows] = await this.pool.query(sql, [...selectParams, ...whereParams]);
      } else {
        // For non-order metrics (registrations, logins) with no group by, just return the subqueries
        const sql = `SELECT ${selects.join(', ')} FROM DUAL`;
        [rows] = await this.pool.query(sql, selectParams);
        rows = rows.map(r => ({ label: 'Total', ...r }));
      }

      // Build summary
      const summary = {};
      if (metrics.includes('tickets_sold')) summary.totalTickets = rows.reduce((s, r) => s + Number(r.tickets_sold || 0), 0);
      if (metrics.includes('revenue')) summary.totalRevenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
      if (metrics.includes('orders_count')) summary.totalOrders = rows.reduce((s, r) => s + Number(r.orders_count || 0), 0);

      return { rows, summary, groupBy, metrics };
    } catch (error) {
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }
}

module.exports = AdminService;
