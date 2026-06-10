class AdminRepository {
  constructor(pool) {
    this.pool = pool;
  }

  static PAID_ORDER_STATUSES = "('paid', 'confirmed', 'completed')";

  _orderSalesSubquery() {
    return `
      SELECT match_id, SUM(quantity) as sold_tickets, SUM(subtotal) as total_revenue
      FROM (
        SELECT t.match_id, oi.quantity, oi.subtotal
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN tickets t ON oi.ticket_id = t.id
        WHERE o.status IN ${AdminRepository.PAID_ORDER_STATUSES}

        UNION ALL

        SELECT m2.id as match_id, oi.quantity, oi.subtotal
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN matches m2 ON o.notes LIKE CONCAT('%Match: ', m2.home_team, ' vs ', m2.away_team, '%')
        WHERE oi.ticket_id IS NULL
          AND o.status IN ${AdminRepository.PAID_ORDER_STATUSES}
      ) order_sales
      GROUP BY match_id
    `;
  }

  // Dashboard Statistics
  async getDashboardStats() {
    const stats = {};
    const paidStatuses = AdminRepository.PAID_ORDER_STATUSES;

    // Total users
    const [userRows] = await this.pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    stats.totalUsers = userRows[0].count;

    // Total matches
    const [matchRows] = await this.pool.query("SELECT COUNT(*) as count FROM matches WHERE status IN ('scheduled', 'live')");
    stats.totalMatches = matchRows[0].count;

    // Total tickets sold from paid order line items (covers seat-based and simple purchases)
    const [ticketRows] = await this.pool.query(`
      SELECT COALESCE(SUM(oi.quantity), 0) as count
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ${paidStatuses}
    `);
    stats.totalTicketsSold = parseInt(ticketRows[0].count, 10);

    // Total revenue from completed orders
    const [revenueRows] = await this.pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE status IN ${paidStatuses}
    `);
    stats.totalRevenue = revenueRows[0].total;

    // Tickets by status
    const [ticketsByStatus] = await this.pool.query('SELECT status, COUNT(*) as count FROM tickets GROUP BY status');
    stats.ticketsByStatus = ticketsByStatus;

    // Recent orders count
    const [recentRows] = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status IN ${paidStatuses}
        AND created_at >= NOW() - INTERVAL 7 DAY
    `);
    stats.recentOrders = recentRows[0].count;

    return stats;
  }

  // User Management
  async getAllUsers(page = 1, limit = 10, search = '', role = '', options = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
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

    if (options.isActive !== undefined && options.isActive !== '') {
      whereClause += ' AND u.is_active = ?';
      params.push(parseInt(options.isActive));
    }

    if (options.dateFrom) {
      whereClause += ' AND u.created_at >= ?';
      params.push(options.dateFrom);
    }

    if (options.dateTo) {
      whereClause += ' AND u.created_at <= ?';
      params.push(options.dateTo + ' 23:59:59');
    }

    let orderSql = 'ORDER BY u.created_at DESC';
    if (options.sortBy) {
      const allowedSortFields = {
        name: 'u.first_name',
        email: 'u.email',
        created_at: 'u.created_at',
        date: 'u.created_at',
        isActive: 'u.is_active',
        status: 'u.is_active'
      };
      const field = allowedSortFields[options.sortBy] || 'u.created_at';
      const dir = (options.sortDir && options.sortDir.toLowerCase() === 'asc') ? 'ASC' : 'DESC';
      orderSql = `ORDER BY ${field} ${dir}`;
    }

    const [users] = await this.pool.query(`
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at, u.updated_at,
             GROUP_CONCAT(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id
      ${orderSql}
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
    const salesSubquery = this._orderSalesSubquery();
    const [rows] = await this.pool.query(`
      SELECT
        m.id,
        m.home_team,
        m.away_team,
        m.match_date,
        m.stadium_id,
        s.name as stadium_name,
        m.base_price,
        m.status as match_status,
        (SELECT COUNT(*) FROM tickets t WHERE t.match_id = m.id) as total_tickets,
        COALESCE(sales.sold_tickets, 0) as sold_tickets,
        COALESCE(sales.total_revenue, 0) as total_revenue
      FROM matches m
      LEFT JOIN stadiums s ON m.stadium_id = s.id
      LEFT JOIN (${salesSubquery}) sales ON sales.match_id = m.id
      ORDER BY m.match_date DESC
    `);
    return rows;
  }

  // Reports - Orders with User Details
  async getOrdersWithDetails(page = 1, limit = 10, status = '', search = '', options = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (o.order_number LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    if (options.dateFrom) {
      whereClause += ' AND o.created_at >= ?';
      params.push(options.dateFrom);
    }

    if (options.dateTo) {
      whereClause += ' AND o.created_at <= ?';
      params.push(options.dateTo + ' 23:59:59');
    }

    if (options.amountMin !== undefined && options.amountMin !== '') {
      whereClause += ' AND o.total_amount >= ?';
      params.push(parseFloat(options.amountMin));
    }

    if (options.amountMax !== undefined && options.amountMax !== '') {
      whereClause += ' AND o.total_amount <= ?';
      params.push(parseFloat(options.amountMax));
    }

    if (options.paymentMethod) {
      whereClause += ' AND o.payment_method = ?';
      params.push(options.paymentMethod);
    }

    let orderSql = 'ORDER BY o.created_at DESC';
    if (options.sortBy) {
      const allowedSortFields = {
        date: 'o.created_at',
        createdAt: 'o.created_at',
        amount: 'o.total_amount',
        totalAmount: 'o.total_amount',
        status: 'o.status'
      };
      const field = allowedSortFields[options.sortBy] || 'o.created_at';
      const dir = (options.sortDir && options.sortDir.toLowerCase() === 'asc') ? 'ASC' : 'DESC';
      orderSql = `ORDER BY ${field} ${dir}`;
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
        o.notes as match_name,
        COALESCE(SUM(oi.quantity), 0) as ticket_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id, o.order_number, o.user_id, o.total_amount, o.status, o.payment_status, o.payment_method, o.customer_email, o.created_at, u.first_name, u.last_name, o.notes
      ${orderSql}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [totalRows] = await this.pool.query(
      `SELECT COUNT(DISTINCT o.id) as count FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereClause}`,
      params
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
      WHERE status IN ${AdminRepository.PAID_ORDER_STATUSES}
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `);
    return rows;
  }

  // Reports - Top Selling Matches
  async getTopSellingMatches(limit = 10) {
    const salesSubquery = this._orderSalesSubquery();
    const [rows] = await this.pool.query(`
      SELECT 
        m.id,
        m.home_team,
        m.away_team,
        m.match_date,
        s.name as stadium_name,
        COALESCE(sales.sold_tickets, 0) as tickets_sold,
        COALESCE(sales.total_revenue, 0) as total_revenue
      FROM matches m
      LEFT JOIN stadiums s ON m.stadium_id = s.id
      INNER JOIN (${salesSubquery}) sales ON sales.match_id = m.id
      WHERE COALESCE(sales.sold_tickets, 0) > 0
      ORDER BY tickets_sold DESC, total_revenue DESC
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

  // Refund/soft-delete order: mark as refunded, free tickets, notify user
  async refundOrder(id, reason = '') {
    // Get order info first (user_id and any ticket IDs)
    const [orders] = await this.pool.query(
      'SELECT id, user_id, total_amount, order_number FROM orders WHERE id = ?',
      [id]
    );
    if (orders.length === 0) return null;

    const order = orders[0];

    // Get associated ticket IDs from order_items
    const [items] = await this.pool.query(
      'SELECT ticket_id FROM order_items WHERE order_id = ? AND ticket_id IS NOT NULL',
      [id]
    );

    // Free up the tickets (set back to available)
    for (const item of items) {
      if (item.ticket_id) {
        await this.pool.query(
          "UPDATE tickets SET status = 'available', purchaser_id = NULL, purchased_at = NULL, updated_at = NOW() WHERE id = ?",
          [item.ticket_id]
        );
      }
    }

    // Soft-delete: mark order as refunded instead of hard-deleting
    const refundNote = reason ? ` | Refund reason: ${reason}` : '';
    await this.pool.query(
      "UPDATE orders SET status = 'refunded', notes = CONCAT(IFNULL(notes,''), ?), updated_at = NOW() WHERE id = ?",
      [refundNote, id]
    );

    return {
      id: order.id,
      userId: order.user_id,
      totalAmount: order.total_amount,
      orderNumber: order.order_number,
      ticketsFreed: items.length
    };
  }

  // Hard delete order: permanently remove without any trace
  async hardDeleteOrder(id) {
    const [orders] = await this.pool.query(
      'SELECT id, user_id, order_number FROM orders WHERE id = ?',
      [id]
    );
    if (orders.length === 0) return null;

    await this.pool.query('DELETE FROM order_items WHERE order_id = ?', [id]);
    await this.pool.query('DELETE FROM orders WHERE id = ?', [id]);
    return orders[0];
  }
}

module.exports = AdminRepository;