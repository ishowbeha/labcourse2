class AdminRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // Dashboard Statistics
  async getDashboardStats() {
    const stats = {};

    // Total users
    const [userRows] = await this.pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    stats.totalUsers = userRows[0].count;

    // Total matches
    const [matchRows] = await this.pool.query("SELECT COUNT(*) as count FROM matches WHERE status IN ('scheduled', 'live')");
    stats.totalMatches = matchRows[0].count;

    // Total tickets sold
    const [ticketRows] = await this.pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'sold'");
    stats.totalTicketsSold = ticketRows[0].count;

    // Total revenue
    const [revenueRows] = await this.pool.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'paid'");
    stats.totalRevenue = revenueRows[0].total;

    // Tickets by status
    const [ticketsByStatus] = await this.pool.query('SELECT status, COUNT(*) as count FROM tickets GROUP BY status');
    stats.ticketsByStatus = ticketsByStatus;

    // Recent orders count
    const [recentRows] = await this.pool.query("SELECT COUNT(*) as count FROM orders WHERE created_at >= NOW() - INTERVAL 7 DAY");
    stats.recentOrders = recentRows[0].count;

    return stats;
  }

  // User Management
  async getAllUsers(page = 1, limit = 10, search = '', role = '') {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE u.is_active = 1';
    const params = [];

    if (search) {
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (role) {
      whereClause += ' AND r.name = ?';
      params.push(role);
    }

    const [users] = await this.pool.query(`
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at, u.updated_at,
             GROUP_CONCAT(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [totalRows] = await this.pool.query(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
    `, params);

    return {
      users: users.map(u => ({
        ...u,
        roles: u.roles ? u.roles.split(',').filter(r => r && r.trim()) : []
      })),
      total: totalRows[0].count,
      page,
      limit,
      totalPages: Math.ceil(totalRows[0].count / limit)
    };
  }

  async getUserById(id) {
    const [users] = await this.pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at, u.updated_at,
             GROUP_CONCAT(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ?
      GROUP BY u.id
    `, [id]);

    if (users.length === 0) return null;

    const user = users[0];
    user.roles = user.roles ? user.roles.split(',').filter(r => r && r.trim()) : [];
    return user;
  }

  async createUser(data, createdBy) {
    const { firstName, lastName, email, password, roleIds = [] } = data;

    // Insert user
    const [result] = await this.pool.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, password, createdBy, createdBy]
    );

    const userId = result.insertId;

    // Assign roles with validation
    if (Array.isArray(roleIds) && roleIds.length > 0) {
      for (const roleId of roleIds) {
        const [roles] = await this.pool.query('SELECT id FROM roles WHERE id = ?', [roleId]);
        if (roles.length > 0) {
          await this.pool.query(
            'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
            [userId, roleId, createdBy]
          );
        }
      }
    }

    return this.getUserById(userId);
  }

  async updateUser(id, data, updatedBy) {
    const { firstName, lastName, email, isActive, roleIds } = data;

    // Update user
    await this.pool.query(
      `UPDATE users SET 
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        is_active = COALESCE(?, is_active),
        updated_by = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [firstName, lastName, email, isActive, updatedBy, id]
    );

    // Update roles if provided
    if (roleIds !== undefined) {
      // Delete existing roles
      await this.pool.query('DELETE FROM user_roles WHERE user_id = ?', [id]);

      // Insert new roles
      if (Array.isArray(roleIds) && roleIds.length > 0) {
        for (const roleId of roleIds) {
          const [roles] = await this.pool.query('SELECT id FROM roles WHERE id = ?', [roleId]);
          if (roles.length > 0) {
            await this.pool.query(
              'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
              [id, roleId, updatedBy]
            );
          }
        }
      }
    }

    return this.getUserById(id);
  }

  async deleteUser(id) {
    await this.pool.query('UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?', [id]);
    return this.getUserById(id);
  }

  async hardDeleteUser(id) {
    await this.pool.query('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }

  // Get all roles
  async getAllRoles() {
    const [rows] = await this.pool.query('SELECT id, name, description FROM roles');
    return rows;
  }

  // Reports - Ticket Sales by Match
  async getTicketSalesByMatch() {
    const [rows] = await this.pool.query(`
      SELECT 
        m.id,
        m.home_team,
        m.away_team,
        m.match_date,
        m.stadium_id,
        s.name as stadium_name,
        COUNT(t.id) as total_tickets,
        SUM(CASE WHEN t.status = 'sold' THEN 1 ELSE 0 END) as sold_tickets,
        SUM(CASE WHEN t.status = 'sold' THEN t.price ELSE 0 END) as total_revenue,
        m.base_price,
        m.status as match_status
      FROM matches m
      LEFT JOIN stadiums s ON m.stadium_id = s.id
      LEFT JOIN tickets t ON t.match_id = m.id
      GROUP BY m.id, m.home_team, m.away_team, m.match_date, m.stadium_id, s.name, m.base_price, m.status
      ORDER BY m.match_date DESC
    `);
    return rows;
  }

  // Reports - Orders with User Details
  async getOrdersWithDetails(page = 1, limit = 10, status = '') {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    const [orders] = await this.pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.total_amount,
        o.status,
        o.payment_status,
        o.payment_method,
        o.customer_email,
        o.created_at,
        u.first_name,
        u.last_name,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id, o.order_number, o.user_id, o.total_amount, o.status, o.payment_status, o.payment_method, o.customer_email, o.created_at, u.first_name, u.last_name
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [totalRows] = await this.pool.query(
      `SELECT COUNT(*) as count FROM orders o WHERE 1=1 ${status ? 'AND o.status = ?' : ''}`,
      status ? [status] : []
    );

    return {
      orders,
      total: totalRows[0].count,
      page,
      limit,
      totalPages: Math.ceil(totalRows[0].count / limit)
    };
  }

  // Reports - Revenue Analytics
  async getRevenueAnalytics(period = 'monthly') {
    let dateFormat;
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        break;
      case 'monthly':
      default:
        dateFormat = '%Y-%m';
        break;
    }

    const [rows] = await this.pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '${dateFormat}') as period,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE status = 'paid'
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `);
    return rows;
  }

  // Reports - Top Selling Matches
  async getTopSellingMatches(limit = 10) {
    const [rows] = await this.pool.query(`
      SELECT 
        m.id,
        m.home_team,
        m.away_team,
        m.match_date,
        s.name as stadium_name,
        COUNT(t.id) as tickets_sold,
        SUM(t.price) as total_revenue
      FROM matches m
      LEFT JOIN stadiums s ON m.stadium_id = s.id
      LEFT JOIN tickets t ON t.match_id = m.id AND t.status = 'sold'
      GROUP BY m.id, m.home_team, m.away_team, m.match_date, s.name
      ORDER BY tickets_sold DESC
      LIMIT ?
    `, [parseInt(limit)]);
    return rows;
  }

  // Get order by ID with items
  async getOrderById(id) {
    const [orders] = await this.pool.query(`
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [id]);

    if (orders.length === 0) return null;

    const order = orders[0];
    const [items] = await this.pool.query(`
      SELECT 
        oi.*,
        t.row_number,
        t.seat_number,
        m.home_team,
        m.away_team,
        m.match_date,
        s.name as section_name
      FROM order_items oi
      LEFT JOIN tickets t ON oi.ticket_id = t.id
      LEFT JOIN matches m ON t.match_id = m.id
      LEFT JOIN sections s ON t.section_id = s.id
      WHERE oi.order_id = ?
    `, [id]);

    order.items = items;
    return order;
  }

  // Update order status
  async updateOrderStatus(id, status, updatedBy) {
    await this.pool.query(
      'UPDATE orders SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [status, updatedBy, id]
    );
    return this.getOrderById(id);
  }
}

module.exports = AdminRepository;