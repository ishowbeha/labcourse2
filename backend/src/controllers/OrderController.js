const OrderService = require('../services/OrderService');
const Stripe = require('stripe');

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

      // ── Enforce max_tickets_per_order from system_settings ──
      const qty = parseInt(quantity);
      try {
        const [[maxRow]] = await this.db.query(
          "SELECT value FROM settings WHERE `key` = 'max_tickets_per_order'"
        );
        const maxAllowed = parseInt(maxRow?.value) || 10;
        if (qty > maxAllowed) {
          return res.status(400).json({
            success: false,
            message: `You can only buy up to ${maxAllowed} ticket(s) per order. Please reduce your quantity.`
          });
        }
      } catch (settingsErr) {
        console.warn('Could not read max_tickets_per_order setting:', settingsErr.message);
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

      // Track in MongoDB Analytics
      try {
        const mongoAnalytics = req.app.get('mongoAnalyticsService');
        if (mongoAnalytics) {
          const matchName = result?.match || '';
          const parts = matchName.split(' vs ');
          await mongoAnalytics.trackTicketSale(matchId, matchName, quantity, result?.totalAmount || 0, userId);
          await mongoAnalytics.trackRevenue(result?.totalAmount || 0, 'ticket_purchase', userId);
        }
      } catch (analyticsErr) {
        // Analytics tracking is best-effort
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

      // ── Enforce max_tickets_per_order from system_settings ──
      const qty = parseInt(quantity);
      try {
        const [[maxRow]] = await this.db.query(
          "SELECT value FROM settings WHERE `key` = 'max_tickets_per_order'"
        );
        const maxAllowed = parseInt(maxRow?.value) || 10;
        if (qty > maxAllowed) {
          return res.status(400).json({
            success: false,
            message: `You can only buy up to ${maxAllowed} ticket(s) per order.`
          });
        }
      } catch (settingsErr) {
        console.warn('Could not read max_tickets_per_order setting:', settingsErr.message);
      }

      const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();
      const unitPrice = totalAmount ? totalAmount / parseInt(quantity) : 50;
      const total = totalAmount || (quantity * 50);

      const combinedNotes = (notes ? notes + ' | ' : '') + 'Match: ' + matchName + (sectionName ? ' | Section: ' + sectionName : '');

      // Try to parse match and section to find real tickets to link
      let linkedTickets = [];
      let matchId = null;
      let sectionId = null;

      const teams = matchName.split(/\s+vs\s+/i);
      if (teams.length === 2) {
        try {
          const [matchRows] = await this.db.query(
            `SELECT id, base_price, stadium_id FROM matches 
             WHERE (home_team LIKE ? AND away_team LIKE ?)
                OR (away_team LIKE ? AND home_team LIKE ?)`,
            [`%${teams[0].trim()}%`, `%${teams[1].trim()}%`, `%${teams[0].trim()}%`, `%${teams[1].trim()}%`]
          );

          if (matchRows.length > 0) {
            matchId = matchRows[0].id;
            const stadiumId = matchRows[0].stadium_id;
            const basePrice = matchRows[0].base_price;

            // Clean section name
            let cleanSectionName = sectionName || 'South Stand';
            if (cleanSectionName.toLowerCase().includes('vip')) {
              if (cleanSectionName.toLowerCase().includes('south')) {
                cleanSectionName = 'VIP South';
              } else {
                cleanSectionName = 'VIP North';
              }
            }

            // Get or create section ID
            const [sectionRows] = await this.db.query(
              'SELECT id, price_multiplier FROM sections WHERE stadium_id = ? AND name = ?',
              [stadiumId, cleanSectionName]
            );

            let multiplier = 1.0;
            if (sectionRows.length > 0) {
              sectionId = sectionRows[0].id;
              multiplier = sectionRows[0].price_multiplier;
            } else {
              const [secRes] = await this.db.query(
                `INSERT INTO sections (stadium_id, name, row_count, seats_per_row, price_multiplier, description, created_at, updated_at)
                 VALUES (?, ?, 10, 30, 1.0, ?, NOW(), NOW())`,
                [stadiumId, cleanSectionName, cleanSectionName]
              );
              sectionId = secRes.insertId;
            }

            // Ensure tickets are generated for this match/section
            const [ticketCountRow] = await this.db.query(
              'SELECT COUNT(*) as count FROM tickets WHERE match_id = ? AND section_id = ?',
              [matchId, sectionId]
            );

            if (ticketCountRow[0].count === 0) {
              const tickets = [];
              const ticketPrice = Math.round((basePrice * multiplier) * 100) / 100;
              // 10 rows x 30 seats = 300 seats
              for (let seatIdx = 1; seatIdx <= 300; seatIdx++) {
                const rowNumber = Math.ceil(seatIdx / 30);
                const seatNumber = ((seatIdx - 1) % 30) + 1;
                tickets.push([matchId, sectionId, rowNumber, seatNumber, ticketPrice, 'available']);
              }

              const placeholders = tickets.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
              await this.db.query(
                `INSERT INTO tickets (\`match_id\`, \`section_id\`, \`row_number\`, \`seat_number\`, \`price\`, \`status\`)
                 VALUES ${placeholders}`,
                tickets.flat()
              );
            }

            // Fetch available tickets
            const [availTickets] = await this.db.query(
              'SELECT id FROM tickets WHERE match_id = ? AND section_id = ? AND status = "available" LIMIT ?',
              [matchId, sectionId, qty]
            );

            if (availTickets.length >= qty) {
              linkedTickets = availTickets;
            }
          }
        } catch (dbErr) {
          console.warn('Could not automatically link tickets for simple-purchase:', dbErr.message);
        }
      }

      // Insert Order
      const [result] = await this.db.query(
        'INSERT INTO orders (user_id, order_number, status, total_amount, payment_method, notes, customer_email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [userId, orderNumber, 'confirmed', total, paymentMethod || 'simulated', combinedNotes, req.user?.email || '']
      );
      const orderId = result.insertId;

      if (linkedTickets.length >= qty) {
        // Link individual tickets to individual order items
        for (let i = 0; i < qty; i++) {
          const ticketId = linkedTickets[i].id;
          await this.db.query(
            'UPDATE tickets SET status = "sold", purchaser_id = ?, purchased_at = NOW() WHERE id = ?',
            [userId, ticketId]
          );
          await this.db.query(
            'INSERT INTO order_items (order_id, ticket_id, quantity, unit_price, subtotal, created_by, updated_by, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?, ?, NOW(), NOW())',
            [orderId, ticketId, unitPrice, unitPrice, userId, userId]
          );
        }
      } else {
        // Fallback: Store purchase info in order_items with NULL ticket_id
        await this.db.query(
          'INSERT INTO order_items (order_id, ticket_id, quantity, unit_price, subtotal, created_by, updated_by, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?, NOW(), NOW())',
          [orderId, qty, unitPrice, total, userId, userId]
        );
      }

      res.status(201).json({
        success: true,
        data: { orderId, orderNumber },
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

  // ── Stripe: create a PaymentIntent ──────────────────────────────────────────
  async createPaymentIntent(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey || stripeSecretKey.startsWith('sk_test_REPLACE')) {
        return res.status(500).json({
          success: false,
          message: 'Stripe is not configured yet. Please add your STRIPE_SECRET_KEY to the backend .env file.'
        });
      }

      const stripe = Stripe(stripeSecretKey);

      const { amount, currency = 'eur', metadata = {} } = req.body;
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'A valid amount (in cents) is required' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // amount in cents
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: String(userId),
          ...metadata,
        },
      });

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error('Stripe PaymentIntent error:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = OrderController;
