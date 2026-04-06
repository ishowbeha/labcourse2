class AdminRepository {
  constructor(db) {
    this.db = db;
  }

  // Dashboard Statistics
  getDashboardStats() {
    const stats = {};

    // Total users
    stats.totalUsers = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;

    // Total matches
    stats.totalMatches = this.db.prepare("SELECT COUNT(*) as count FROM matches WHERE status IN ('scheduled', 'live')").get().count;

    // Total tickets sold
    stats.totalTicketsSold = this.db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'sold'").get().count;

    // Total revenue
    const revenue = this.db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'paid'").get();
    stats.totalRevenue = revenue.total;

    // Tickets by status
    stats.ticketsByStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM tickets 
      GROUP BY status
    `).all();

    // Recent orders count
    stats.recentOrders = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE created_at >= datetime('now', '-7 days')
    `).get().count;

    return stats;
  }

  // User Management
  getAllUsers(page = 1, limit = 10, search = '', role = '') {
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

    const users = this.db.prepare(`
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at, u.updated_at,
             GROUP_CONCAT(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = this.db.prepare(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
    `).get(...params).count;

    return {
      users: users.map(u => ({
        ...u,
        roles: u.roles ? u.roles.split(',').filter(r => r && r.trim()) : []
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  getUserById(id) {
    const user = this.db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at, u.updated_at,
             GROUP_CONCAT(r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(id);

    if (user) {
      user.roles = user.roles ? user.roles.split(',').filter(r => r && r.trim()) : [];
    }

    return user;
  }

  createUser(data, createdBy) {
    const { firstName, lastName, email, password, roleIds = [] } = data;
    
    // Insert user
    const result = this.db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(firstName, lastName, email, password, createdBy, createdBy);

    const userId = result.lastInsertRowid;

    // Assign roles with validation
    if (Array.isArray(roleIds) && roleIds.length > 0) {
      const getRole = this.db.prepare('SELECT id FROM roles WHERE id = ?');
      const insertRole = this.db.prepare(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES (?, ?, ?)
      `);
      roleIds.forEach(roleId => {
        const role = getRole.get(roleId);
        if (role) {
          insertRole.run(userId, roleId, createdBy);
        }
      });
    }

    return this.getUserById(userId);
  }

  updateUser(id, data, updatedBy) {
    const { firstName, lastName, email, isActive, roleIds } = data;

    // Use transaction for atomic updates
    const updateUserTx = this.db.transaction(() => {
      // Update user
      this.db.prepare(`
        UPDATE users SET 
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          email = COALESCE(?, email),
          is_active = COALESCE(?, is_active),
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(firstName, lastName, email, isActive, updatedBy, id);

      // Update roles if provided
      if (roleIds !== undefined) {
        // Delete existing roles
        this.db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(id);

        // Insert new roles
        if (Array.isArray(roleIds) && roleIds.length > 0) {
          // Validate role IDs exist
          const getRole = this.db.prepare('SELECT id FROM roles WHERE id = ?');
          const insertRole = this.db.prepare(`
            INSERT INTO user_roles (user_id, role_id, assigned_by)
            VALUES (?, ?, ?)
          `);
          roleIds.forEach(roleId => {
            const role = getRole.get(roleId);
            if (role) {
              insertRole.run(id, roleId, updatedBy);
            }
          });
        }
      }
    });

    updateUserTx();
    return this.getUserById(id);
  }

  deleteUser(id) {
    this.db.prepare('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    return this.getUserById(id);
  }

  hardDeleteUser(id) {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return true;
  }

  // Get all roles
  getAllRoles() {
    return this.db.prepare('SELECT id, name, description FROM roles').all();
  }

  // Reports - Ticket Sales by Match
  getTicketSalesByMatch() {
    return this.db.prepare(`
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
    `).all();
  }

  // Reports - Orders with User Details
  getOrdersWithDetails(page = 1, limit = 10, status = '') {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    const orders = this.db.prepare(`
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
    `).all(...params, limit, offset);

    const total = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders o WHERE 1=1 ${status ? 'AND o.status = ?' : ''}
    `).get(...(status ? [status] : [])).count;

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Reports - Revenue Analytics
  getRevenueAnalytics(period = 'monthly') {
    let groupFormat;
    switch (period) {
      case 'daily':
        groupFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        groupFormat = '%Y-%W';
        break;
      case 'monthly':
      default:
        groupFormat = '%Y-%m';
        break;
    }

    return this.db.prepare(`
      SELECT 
        strftime('${groupFormat}', created_at) as period,
        COUNT(*) as order_count,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE status = 'paid'
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `).all();
  }

  // Reports - Top Selling Matches
  getTopSellingMatches(limit = 10) {
    return this.db.prepare(`
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
    `).all(limit);
  }

  // Get order by ID with items
  getOrderById(id) {
    const order = this.db.prepare(`
      SELECT 
        o.*,
        u.first_name,
        u.last_name,
        u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(id);

    if (order) {
      order.items = this.db.prepare(`
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
      `).all(id);
    }

    return order;
  }

  // Update order status
  updateOrderStatus(id, status, updatedBy) {
    this.db.prepare(`
      UPDATE orders SET 
        status = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, updatedBy, id);

    return this.getOrderById(id);
  }
}

module.exports = AdminRepository;