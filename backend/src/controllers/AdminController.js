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
      const { page = 1, limit = 10, search = '', role = '', isActive = '', dateFrom = '', dateTo = '', sortBy = '', sortDir = '' } = req.query;
      const result = await this.service.getAllUsers(
        parseInt(page),
        parseInt(limit),
        search,
        role,
        { isActive, dateFrom, dateTo, sortBy, sortDir }
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
      const { page = 1, limit = 10, status = '', search = '', dateFrom = '', dateTo = '', amountMin = '', amountMax = '', paymentMethod = '', sortBy = '', sortDir = '' } = req.query;
      const result = await this.service.getOrdersWithDetails(
        parseInt(page),
        parseInt(limit),
        status,
        search,
        { dateFrom, dateTo, amountMin, amountMax, paymentMethod, sortBy, sortDir }
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

  // Refund order - frees tickets and notifies user
  async refundOrder(req, res, next) {
    try {
      const orderId = req.params.id;
      const { reason = '' } = req.body;
      const result = await this.service.refundOrder(orderId, reason);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Send real-time notification to the user via WebSocket
      const io = req.app.get('io');
      if (io && io.notifyUser) {
        const reasonStr = reason ? ` (Reason: ${reason})` : '';
        const message = `Your order #${result.orderNumber} has been refunded (€${parseFloat(result.totalAmount).toFixed(2)})${reasonStr}. The tickets are now available for other users.`;
        await io.notifyUser(result.userId, {
          type: 'refund',
          title: '🎫 Order Refunded',
          message: message
        });
      }

      res.json({
        success: true,
        message: 'Order refunded successfully. User has been notified.',
        data: {
          orderId: result.id,
          orderNumber: result.orderNumber,
          refunded: true,
          ticketsFreed: result.ticketsFreed
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Hard delete order - permanent, no trace, no notification
  async hardDeleteOrder(req, res, next) {
    try {
      const orderId = req.params.id;
      const result = await this.service.hardDeleteOrder(orderId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        message: 'Order permanently deleted.',
        data: {
          orderId: result.id,
          orderNumber: result.order_number,
          deleted: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Ticket Management ───────────────────────────────────────────────────────
  async getTickets(req, res, next) {
    try {
      const {
        page = 1, limit = 20,
        status = '', matchId = '', sectionId = '',
        search = '', sortBy = 'created_at', sortDir = 'desc'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const params = [];
      let where = 'WHERE 1=1';

      if (status) { where += ' AND t.status = ?'; params.push(status); }
      if (matchId) { where += ' AND t.match_id = ?'; params.push(parseInt(matchId)); }
      if (sectionId) { where += ' AND t.section_id = ?'; params.push(parseInt(sectionId)); }
      if (search) {
        where += ' AND (CONCAT(m.home_team, " vs ", m.away_team) LIKE ? OR s.name LIKE ? OR u.email LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q);
      }

      const allowedSort = {
        created_at: 't.created_at', price: 't.price',
        status: 't.status', match: 'm.match_date'
      };
      const orderCol = allowedSort[sortBy] || 't.created_at';
      const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

      const [tickets] = await this.db.query(`
        SELECT
          t.id, t.status, t.price, t.created_at, t.purchased_at,
          t.row_number, t.seat_number,
          m.id as match_id,
          CONCAT(m.home_team, ' vs ', m.away_team) as match_name,
          m.match_date, m.match_time, m.competition,
          s.id as section_id, s.name as section_name,
          u.id as purchaser_id, u.first_name, u.last_name, u.email as purchaser_email
        FROM tickets t
        LEFT JOIN matches m ON t.match_id = m.id
        LEFT JOIN sections s ON t.section_id = s.id
        LEFT JOIN users u ON t.purchaser_id = u.id
        ${where}
        ORDER BY ${orderCol} ${orderDir}
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]);

      const [[{ total }]] = await this.db.query(
        `SELECT COUNT(*) as total FROM tickets t
         LEFT JOIN matches m ON t.match_id = m.id
         LEFT JOIN sections s ON t.section_id = s.id
         LEFT JOIN users u ON t.purchaser_id = u.id
         ${where}`,
        params
      );

      // KPI summary — from the tickets table (seat-based purchases)
      const [kpiRows] = await this.db.query(`
        SELECT
          CAST(COUNT(*) AS SIGNED) as total_tickets,
          CAST(SUM(status = 'available') AS SIGNED) as available,
          CAST(SUM(status = 'sold') AS SIGNED) as sold,
          CAST(SUM(status = 'reserved') AS SIGNED) as reserved,
          CAST(COALESCE(SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END), 0) AS DECIMAL(12,2)) as revenue
        FROM tickets
      `);

      // Also count "simple-purchase" orders (ticket_id IS NULL) — Stripe / simulated flow
      const [simpleRows] = await this.db.query(`
        SELECT
          CAST(COALESCE(SUM(oi.quantity), 0) AS SIGNED) as simple_sold,
          CAST(COALESCE(SUM(oi.subtotal), 0) AS DECIMAL(12,2)) as simple_revenue
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE oi.ticket_id IS NULL
          AND o.status IN ('paid', 'confirmed', 'completed')
      `);

      const kpiBase = kpiRows[0];
      const simpleSold  = parseInt(simpleRows[0]?.simple_sold  || 0, 10);
      const simpleRev   = parseFloat(simpleRows[0]?.simple_revenue || 0);

      const kpi = {
        total_tickets: parseInt(kpiBase.total_tickets || 0, 10),
        available:     parseInt(kpiBase.available     || 0, 10),
        sold:          parseInt(kpiBase.sold           || 0, 10) + simpleSold,
        reserved:      parseInt(kpiBase.reserved       || 0, 10),
        revenue:       parseFloat(kpiBase.revenue      || 0)    + simpleRev,
      };

      res.json({
        success: true,
        data: {
          tickets,
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
          kpi
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTicketStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const allowed = ['available', 'reserved', 'sold'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${allowed.join(', ')}` });
      }

      const [[ticket]] = await this.db.query('SELECT id, status FROM tickets WHERE id = ?', [id]);
      if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

      const clearPurchaser = status === 'available' ? ', purchaser_id = NULL, purchased_at = NULL' : '';
      await this.db.query(
        `UPDATE tickets SET status = ?${clearPurchaser}, updated_at = NOW() WHERE id = ?`,
        [status, id]
      );

      res.json({ success: true, message: `Ticket #${id} status updated to "${status}"`, data: { id, status } });
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

  // =====================
  // COUPONS MANAGEMENT
  // =====================
  async getAllCoupons(req, res, next) {
    try {
      const [rows] = await this.db.query('SELECT * FROM coupons ORDER BY created_at DESC');
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async createCoupon(req, res, next) {
    try {
      const { code, description, discount_type, discount_value, max_uses } = req.body;
      if (!code) return res.status(400).json({ success: false, message: 'Coupon code is required' });
      const val = parseFloat(discount_value);
      if (isNaN(val) || val <= 0) return res.status(400).json({ success: false, message: 'A valid discount value is required' });
      const uses = parseInt(max_uses) || 100;
      await this.db.query(
        'INSERT INTO coupons (code, description, discount_type, discount_value, max_uses, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [code.toUpperCase().trim(), description || null, discount_type || 'percentage', val, uses, req.user.id]
      );
      res.json({ success: true, message: 'Coupon created' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      next(error);
    }
  }

  async toggleCouponStatus(req, res, next) {
    try {
      const { id } = req.params;
      const [coupon] = await this.db.query('SELECT is_active FROM coupons WHERE id = ?', [id]);
      if (!coupon.length) return res.status(404).json({ success: false, message: 'Coupon not found' });
      const newStatus = coupon[0].is_active ? 0 : 1;
      await this.db.query('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, id]);
      res.json({ success: true, message: 'Coupon status updated' });
    } catch (error) { next(error); }
  }

  async deleteCoupon(req, res, next) {
    try {
      await this.db.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) { next(error); }
  }

  // =====================
  // FAVORITES
  // =====================
  async getUserFavorites(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });
      const [rows] = await this.db.query(
        `SELECT f.*, m.home_team, m.away_team, m.match_date, m.match_time, s.name as stadium_name
         FROM favorites f
         LEFT JOIN matches m ON f.match_id = m.id
         LEFT JOIN stadiums s ON m.stadium_id = s.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC`,
        [userId]
      );
      res.json({ success: true, data: rows });
    } catch (error) { next(error); }
  }

  async toggleFavorite(req, res, next) {
    try {
      const { match_id, stadium_id } = req.body;
      const userId = req.user?.userId || req.user?.id;
      if (!userId || !match_id) return res.status(400).json({ success: false, message: 'User ID and match ID required' });
      // Check if already favorited
      const [existing] = await this.db.query('SELECT id FROM favorites WHERE user_id = ? AND match_id = ?', [userId, match_id]);
      if (existing.length > 0) {
        await this.db.query('DELETE FROM favorites WHERE id = ?', [existing[0].id]);
        return res.json({ success: true, favorited: false, message: 'Removed from favorites' });
      }
      await this.db.query(
        'INSERT INTO favorites (user_id, match_id, stadium_id, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [userId, parseInt(match_id), stadium_id || null, userId, userId]
      );
      res.json({ success: true, favorited: true, message: 'Added to favorites' });
    } catch (error) { next(error); }
  }

  // =====================
  // COUPON VALIDATION (for checkout)
  // =====================
  async validateCoupon(req, res, next) {
    try {
      const { code, orderTotal } = req.body;
      const [coupons] = await this.db.query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (valid_from IS NULL OR valid_from <= NOW()) AND (valid_until IS NULL OR valid_until >= NOW())',
        [code]
      );
      if (!coupons.length) return res.json({ success: false, message: 'Invalid or expired coupon' });

      const coupon = coupons[0];
      if (coupon.used_count >= coupon.max_uses) return res.json({ success: false, message: 'Coupon usage limit reached' });
      if (coupon.min_order_amount && orderTotal < parseFloat(coupon.min_order_amount)) return res.json({ success: false, message: `Minimum order amount: €${coupon.min_order_amount}` });

      // ── Read max_discount_percent from system_settings ──
      let maxDiscountPercent = 100; // fallback: no cap
      try {
        const [[row]] = await this.db.query(
          "SELECT value FROM settings WHERE `key` = 'max_discount_percent'"
        );
        if (row) maxDiscountPercent = parseFloat(row.value) || 100;
      } catch { /* ignore */ }

      // ── Check allow_stacking_coupons (future: pass existing coupons count in body) ──

      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        // Cap the effective percentage at system max
        const effectivePct = Math.min(parseFloat(coupon.discount_value), maxDiscountPercent);
        discount = (parseFloat(orderTotal) * effectivePct) / 100;
        if (effectivePct < parseFloat(coupon.discount_value)) {
          return res.json({
            success: true,
            data: {
              id: coupon.id, code: coupon.code,
              discount_type: coupon.discount_type,
              discount_value: effectivePct,
              discount,
              description: coupon.description,
              cappedNote: `Discount capped at system maximum of ${maxDiscountPercent}%`
            }
          });
        }
      } else {
        discount = parseFloat(coupon.discount_value);
      }

      // Increment used_count
      await this.db.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);

      res.json({ success: true, data: { id: coupon.id, code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value, discount, description: coupon.description } });
    } catch (error) { next(error); }
  }
}

module.exports = AdminController;
