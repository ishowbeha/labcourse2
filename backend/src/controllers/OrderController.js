const OrderService = require('../services/OrderService');

class OrderController {
  constructor(db) {
    this.db = db;
    this.service = new OrderService(db);
  }

  async purchaseTickets(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { matchId, sectionName, quantity, paymentMethod, notes } = req.body;

      if (!matchId || !sectionName || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'matchId, sectionName, and quantity are required'
        });
      }

      const userEmail = req.user?.email || '';
      const result = await this.service.purchaseTickets(userId, {
        matchId: parseInt(matchId),
        sectionName,
        quantity: parseInt(quantity),
        paymentMethod: paymentMethod || 'credit-card',
        customerEmail: userEmail,
        notes
      });

      // Notify only the purchasing user about their order confirmation
      const io = req.app.get('io');
      if (io && io.notifyUser) {
        await io.notifyUser(userId, {
          type: 'order_confirmed',
          title: '✅ Purchase Confirmed',
          message: `${quantity} ticket(s) for ${result.match} confirmed (€${(result.totalAmount || 0).toFixed(2)})`
        });
      }

      // Write to audit_logs for activity tracking
      try {
        await this.db.query(
          'INSERT INTO audit_logs (user_id, action, entity, entity_id, new_value, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            userId,
            'purchase',
            'ticket',
            result?.orderId || null,
            JSON.stringify({ match: result?.match, quantity, totalAmount: result?.totalAmount }),
            req.ip || null,
            req.headers['user-agent'] || null
          ]
        );
      } catch (logErr) {
        console.log('Audit log write failed:', logErr.message);
      }

      res.status(201).json({
        success: true,
        data: result,
        message: 'Tickets purchased successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async saveSimpleOrder(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const { matchName, sectionName, quantity, totalAmount, paymentMethod, notes } = req.body;
      if (!matchName || !quantity) return res.status(400).json({ success: false, message: 'matchName and quantity required' });

      const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();
      const unitPrice = totalAmount ? totalAmount / parseInt(quantity) : 50;
      const total = totalAmount || (quantity * 50);

      const combinedNotes = (notes ? notes + ' | ' : '') + 'Match: ' + matchName + (sectionName ? ' - ' + sectionName : '');
      const [result] = await this.db.query(
        'INSERT INTO orders (user_id, order_number, status, total_amount, payment_method, notes, customer_email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, orderNumber, 'confirmed', total, paymentMethod || 'simulated', combinedNotes, req.user?.email || '']
      );

      // Store purchase info in order_items (ticket_id is nullable now)
      await this.db.query(
        'INSERT INTO order_items (order_id, ticket_id, quantity, unit_price, subtotal, created_at) VALUES (?, NULL, ?, ?, ?, NOW())',
        [result.insertId, parseInt(quantity), unitPrice, total]
      );

      res.status(201).json({
        success: true,
        data: { orderId: result.insertId, orderNumber },
        message: 'Order saved successfully'
      });
    } catch (error) { next(error); }
  }

  async getUserOrders(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { page = 1, limit = 10 } = req.query;
      const result = await this.service.getUserOrders(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;