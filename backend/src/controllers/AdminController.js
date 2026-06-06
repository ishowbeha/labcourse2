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
      const { page = 1, limit = 10, status = '', search = '' } = req.query;
      const result = await this.service.getOrdersWithDetails(
        parseInt(page),
        parseInt(limit),
        status,
        search
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
      const result = await this.service.refundOrder(orderId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Send real-time notification to the user via WebSocket
      const io = req.app.get('io');
      if (io && io.notifyUser) {
        const message = `Your order #${result.orderNumber} has been refunded (€${parseFloat(result.totalAmount).toFixed(2)}). The tickets are now available for other users.`;
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
      await this.db.query('INSERT INTO favorites (user_id, match_id, stadium_id) VALUES (?, ?, ?)', [userId, parseInt(match_id), stadium_id || null]);
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
          "SELECT setting_value FROM system_settings WHERE setting_key = 'max_discount_percent'"
        );
        if (row) maxDiscountPercent = parseFloat(row.setting_value) || 100;
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
